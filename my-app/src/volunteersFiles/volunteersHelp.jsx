const VolunteersHelp = () => { return (<section className="help-section">
      {/* Left image */}
      <div className="help-image">
        <img
          src="/src/assets/hand.png" 
          alt="Helping hands"
        />
      </div>

      
      <div className="help-content">
        <h2>Как можеш да помагаш?</h2>

        <div className="help-grid">
          <div>
            <h3>На терен</h3>
            <p>участие в местни инициативи и подкрепа при нужда.</p>
          </div>

          <div>
            <h3>Знания и умения</h3>
            <p>връзка с институции, технологии и експерти.</p>
          </div>

          <div>
            <h3>Глас и влияние</h3>
            <p>
              споделяй кампании, информирай приятели и бъди посланик на каузата
              в твоя град.
            </p>
          </div>

          <div>
            <h3>С креативност</h3>
            <p>
              създавай съдържание, дизайни, видеа и материали, които вдъхновяват
              другите да се включат.
            </p>
          </div>
        </div>
      </div>
      </section>)
    }

    export default VolunteersHelp

