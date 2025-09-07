import { useState } from "react";
import "./FormSignalFire.css";

const FormSignalFire = () => {
  const API_URL = "http://localhost:3000/detections";

  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [responseType, setResponseType] = useState("");

  const validate = (currentLat, currentLon, currentFile) => {
    const newErrors = {};
    const latNum = Number(currentLat);
    const lonNum = Number(currentLon);
    if (currentLat === "" || Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      newErrors.lat = "Невалидна ширина (между -90 и 90)";
    }
    if (currentLon === "" || Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      newErrors.lon = "Невалидна дължина (между -180 и 180)";
    }
    const f = currentFile;
    if (!f) {
      newErrors.file = "Моля, прикачете снимка";
    } else {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(f.type)) {
        newErrors.file = "Невалиден формат. Разрешени: JPEG, PNG, WEBP";
      }
      const maxBytes = 10 * 1024 * 1024;
      if (f.size > maxBytes) {
        newErrors.file = "Файлът е твърде голям (макс. 10MB)";
      }
    }
    return newErrors;
  };

  const handleLatChange = (e) => {
    const v = e.target.value;
    setLat(v);
    if (touched.lat) setErrors(validate(v, lon, file));
  };
  const handleLonChange = (e) => {
    const v = e.target.value;
    setLon(v);
    if (touched.lon) setErrors(validate(lat, v, file));
  };
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
    setErrors(validate(lat, lon, file));
  };
  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setFile(selected);
    setTouched((p) => ({ ...p, file: true }));
    setErrors(validate(lat, lon, selected));
  };

  const getLocation = () => {
    setResponseMsg("");
    setResponseType("");
    if (!navigator.geolocation) {
      setErrors((p) => ({ ...p, lat: "Геолокацията не се поддържа", lon: "Геолокацията не се поддържа" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const l1 = latitude.toFixed(6);
        const l2 = longitude.toFixed(6);
        setLat(l1);
        setLon(l2);
        setTouched((p) => ({ ...p, lat: true, lon: true }));
        setErrors(validate(l1, l2, file));
      },
      () => {
        setErrors((p) => ({ ...p, lat: "Неуспешно вземане на локация", lon: "Неуспешно вземане на локация" }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponseMsg("");
    setResponseType("");
    setTouched({ lat: true, lon: true, file: true });
    const validation = validate(lat, lon, file);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const data = new FormData();
    data.append("lat", String(lat).trim());
    data.append("lon", String(lon).trim());
    if (file) data.append("file", file);

    setSubmitting(true);
    try {
      const response = await fetch(API_URL, { method: "POST", body: data });

      let resultMsg = "Сигналът е изпратен успешно!";
      if (!response.ok) {
        try {
          const err = await response.json();
          resultMsg = err?.message || `Грешка: ${response.status}`;
        } catch (_) {
          resultMsg = `Грешка: ${response.status}`;
        }
        setResponseMsg(resultMsg);
        setResponseType("error");
        return;
      }

      try {
        const result = await response.json();
        resultMsg = result?.message || resultMsg;
      } catch (_) {}

      setResponseMsg(resultMsg);
      setResponseType("success");
      setLat("");
      setLon("");
      setFile(null);
      setErrors({});
      setTouched({});
    } catch {
      setResponseMsg("Мрежова грешка. Опитайте отново.");
      setResponseType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      encType="multipart/form-data"
      className="signal-fire-form"
    >
      <div className="row">
        <div className="half field-group">
          <label className="normalLabel">Ширина (Lat)</label>
          <input
            type="number"
            name="lat"
            value={lat}
            onChange={handleLatChange}
            onBlur={handleBlur}
            step="any"
            inputMode="decimal"
            placeholder="напр. 42.6977"
            min={-90}
            max={90}
            required
            aria-invalid={touched.lat && !!errors.lat}
            aria-describedby={touched.lat && errors.lat ? "lat-error" : undefined}
            className={`smallInput ${touched.lat && errors.lat ? "input-error" : ""}`}
          />
          <div className="error-slot">
            {touched.lat && errors.lat && (
              <span id="lat-error" className="field-error">{errors.lat}</span>
            )}
          </div>
        </div>

        <div className="half field-group">
          <label className="normalLabel">Дължина (Lon)</label>
          <input
            type="number"
            name="lon"
            value={lon}
            onChange={handleLonChange}
            onBlur={handleBlur}
            step="any"
            inputMode="decimal"
            placeholder="напр. 23.3219"
            min={-180}
            max={180}
            required
            aria-invalid={touched.lon && !!errors.lon}
            aria-describedby={touched.lon && errors.lon ? "lon-error" : undefined}
            className={`smallInput ${touched.lon && errors.lon ? "input-error" : ""}`}
          />
          <div className="error-slot">
            {touched.lon && errors.lon && (
              <span id="lon-error" className="field-error">{errors.lon}</span>
            )}
          </div>
        </div>

        <div className="btn-col">
          <button type="button" className="secondaryButton full-width" onClick={getLocation}>
            Вземи GPS
          </button>
        </div>
      </div>

      <label className="normalLabel">Качи снимка</label>
      <div className="file-upload">
        <input
          type="file"
          id="fireFileInput"
          onChange={handleFileChange}
          accept="image/*"
          multiple={false}
          className="file-upload"
        />
        <label
          htmlFor="fireFileInput"
          className={`file-dropzone ${touched.file && errors.file ? "input-error" : ""}`}
        >
          <span className="file-icon">⬆️</span>
          <p id="chooseFireFile">{file ? file.name : "Изберете файл или го пуснете тук"}</p>
        </label>
        {touched.file && errors.file && (
          <span id="file-error" className="field-error">{errors.file}</span>
        )}
      </div>

      {responseMsg && (
        <p
          className={`form-message ${responseType}`}
          role="status"
          aria-live={responseType === "error" ? "assertive" : "polite"}
        >
          {responseMsg}
        </p>
      )}

      <div className="btn-row">
        <button type="submit" className="firstButton primaryButton" disabled={submitting}>
          Изпрати сигнал
        </button>
      </div>
    </form>
  );
};

export default FormSignalFire;
