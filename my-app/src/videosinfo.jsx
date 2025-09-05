import Navigation from "./homeFiles/Navigation";
import './App.css';

const Videoinfo = () => {
    return (
        <div className = "videoinfo">
        <img src="assets\default.jpg" alt=""></img>
        <div>
         <h1>Знанието спасява животи</h1>
         <p>
            Гледай нашите кратки видеа за превенция, 
            действия по време на пожар и първа долекарска помощ.
             Подготви се за критични ситуации и помогни на себе си и на другите. 
             Сподели информацията с близки и приятели, защото знанието може да спаси живот.
         </p>
         
         <button className="button">Регистрирай се</button>
         </div>
         </div>
         
    )
}

export default Videoinfo