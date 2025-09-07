/**
 * Canadian Forest Fire Weather Index (FWI) daily update + normalized 0–100 risk%.
 * Inputs are standard noon weather obs + previous day's FFMC/DMC/DC (or seasonal starts).
 */
export type FWIInputs = {
    temp: number;       // °C (noon)
    rh: number;         // %  (noon)
    wind: number;       // km/h at 10 m (noon)
    rain: number;       // mm in last 24h (to noon)
    month: number;      // 1..12
    prevFFMC?: number;  // default 85
    prevDMC?: number;   // default 6
    prevDC?: number;    // default 15
  };
  
  export type FWIResult = {
    ffmc: number;
    dmc: number;
    dc: number;
    isi: number;
    bui: number;
    fwi: number;
    riskPercent: number; // 0..100 normalized (heuristic)
  };
  
  export function computeFWI({
    temp, rh, wind, rain, month,
    prevFFMC = 85, prevDMC = 6, prevDC = 15,
  }: FWIInputs): FWIResult {
    // --- clamp helpers
    const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
    temp = clamp(temp, -40, 60);
    rh   = clamp(rh,    0, 100);
    wind = Math.max(0, wind);
    rain = Math.max(0, rain);
    month = clamp(month, 1, 12);
  
    // --- Monthly day-length factors (standard table used in many implementations)
    //     Index 0 unused; months 1..12.
    const Lf = [0, 6.5, 7.5, 9.0, 12.8, 16.0, 17.2, 16.0, 14.0, 12.3, 10.3, 9.0, 7.8]; // for DMC
    const Le = [0, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6];        // DC “day length” factor (simplified)
  
    // -------------------------------
    // 1) FFMC (Fine Fuel Moisture Code)
    // -------------------------------
    let ffmc = prevFFMC;
    let mo = 147.2 * (101.0 - ffmc) / (59.5 + ffmc);
  
    if (rain > 0.5) {
      const rf = rain - 0.5;
      const mo1 = mo + 42.5 * rf * Math.exp(-100.0 / (251.0 - mo)) * (1.0 - Math.exp(-6.93 / rf)) + 0.0015 * (mo - 150.0) * (mo - 150.0) * Math.sqrt(rf);
      mo = Math.min(mo1, 250.0);
    }
  
    const Ed = 0.942 * Math.pow(rh, 0.679) + (11.0 * Math.exp((rh - 100.0) / 10.0)) + 0.18 * (21.1 - temp) * (1.0 - Math.exp(-0.115 * rh));
    const Ew = 0.618 * Math.pow(rh, 0.753) + (10.0 * Math.exp((rh - 100.0) / 10.0)) + 0.18 * (21.1 - temp) * (1.0 - Math.exp(-0.115 * rh));
  
    let m: number;
    if (mo < Ed) {
      const Ko = 0.424 * (1.0 - Math.pow(rh / 100.0, 1.7)) + (0.0694 * Math.sqrt(wind)) * (1.0 - Math.pow(rh / 100.0, 8.0));
      const Kd = Ko * 0.581 * Math.exp(0.0365 * temp);
      m = Ed - (Ed - mo) * Math.pow(10.0, -Kd);
    } else {
      const Kw0 = 0.424 * (1.0 - Math.pow((100.0 - rh) / 100.0, 1.7)) + (0.0694 * Math.sqrt(wind)) * (1.0 - Math.pow((100.0 - rh) / 100.0, 8.0));
      const Kw = Kw0 * 0.581 * Math.exp(0.0365 * temp);
      m = Ew + (mo - Ew) * Math.pow(10.0, -Kw);
    }
    ffmc = (59.5 * (250.0 - m)) / (147.2 + m);
    ffmc = clamp(ffmc, 0, 101);
  
    // -------------------------------
    // 2) DMC (Duff Moisture Code)
    // -------------------------------
    let dmc = prevDMC;
    const rk = rain;
    if (rk > 1.5) {
      const rw = 0.92 * rk - 1.27;
      const Mo = 20.0 + Math.exp(5.6348 - dmc / 43.43);
      let b: number;
      if (dmc <= 33.0) b = 100.0 / (0.5 + 0.3 * dmc);
      else if (dmc <= 65.0) b = 14.0 - 1.3 * Math.log(dmc);
      else b = 6.2 * Math.log(dmc) - 17.2;
      const Mr = Mo + (1000.0 * rw) / (48.77 + b * rw);
      dmc = 43.43 * (5.6348 - Math.log(Math.max(1e-9, Mr - 20.0)));
    }
    const K = 1.894 * (temp + 1.1) * (100.0 - rh) * Lf[month] * 1e-6;
    dmc = Math.max(0, dmc + K);
  
    // -------------------------------
    // 3) DC (Drought Code)
    // -------------------------------
    let dc = prevDC;
    if (rain > 2.8) {
      const rw = 0.83 * rain - 1.27;
      const Qo = 800.0 * Math.exp(-dc / 400.0);
      const Qr = Qo + 3.937 * rw;
      dc = 400.0 * Math.log(800.0 / Math.max(1e-9, Qr));
    }
    // Seasonal drying factor (monthly), classic form uses a temp term too:
    const V = 0.36 * (temp + 2.8) + Le[month];
    dc = Math.max(0, dc + Math.max(0, V));
  
    // -------------------------------
    // 4) ISI (Initial Spread Index) and BUI (Build-Up Index)
    // -------------------------------
    const mo2 = 147.2 * (101.0 - ffmc) / (59.5 + ffmc);
    const ff = Math.exp(0.05039 * wind); // wind function
    const isi = 0.208 * ff * Math.max(0, 91.9 * Math.exp(-0.1386 * mo2) * (1 + mo2 ** 5.31 / (4.93e7)));
  
    let bui: number;
    if (dmc <= 0.4 * dc) {
      const buiDen = 0.8 * dc * dmc / (dmc + 0.4 * dc);
      bui = isFinite(buiDen) ? buiDen : 0;
    } else {
      const buiVal = dmc - (1.0 - 0.8 * dc / (dmc + 0.4 * dc)) * (0.92 + Math.pow(0.0114 * dmc, 1.7));
      bui = Math.max(0, buiVal);
    }
  
    // -------------------------------
    // 5) FWI (overall index)
    // -------------------------------
    let fD = 0.0;
    if (bui > 0) {
      const b = 0.1 * isi * (0.626 * Math.pow(bui, 0.809) + 2.0);
      fD = b > 1.0 ? Math.exp(2.72 * Math.pow(0.434 * Math.log(b), 0.647)) : b;
    }
    const fwi = Math.max(0, fD);
  
    // -------------------------------
    // 6) Normalize FWI to 0–100 “risk %” (heuristic)
    //     Map typical FWI 0–30 linearly to 0–100% for clearer values.
    // -------------------------------
    const riskPercent = Math.min(100, (fwi / 30) * 100);
  
    return {
      ffmc: Number(ffmc.toFixed(2)),
      dmc: Number(dmc.toFixed(2)),
      dc: Number(dc.toFixed(2)),
      isi: Number(isi.toFixed(2)),
      bui: Number(bui.toFixed(2)),
      fwi: Number(fwi.toFixed(2)),
      riskPercent: Number(riskPercent.toFixed(1)),
    };
  }
  