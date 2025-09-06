import Navigation from "./homeFiles/Navigation";
import './App.css';

const Videoinfo = ({heading, picture, paragraph}) => {
    return (
        <div className="card border gridColumnCard">
            <img src={imgSrc} alt={alt} className="center"></img>
            <h3 className="center">{heading}</h3>
            <p className="centervertically">{paragraph}</p>
         <button className="button">Регистрирай се</button>
         </div>
         
    )
}

export default Videoinfo