import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';

const Navigation = () => {
    return (
        <nav className="mainNavigation flexContainer sidePadding">
            <img src={logo} alt="logo"></img>
            <div className="flexContainer">
            <ul className="navigationList">
                <li><Link to="/">Начало</Link></li>
                <li><Link to="volunteers">Доброволци</Link></li>
                <li><Link to="map">Карта</Link></li>
                <li><Link to="info">Информация</Link></li>
                <li><Link to="SignalFire">Сигнал</Link></li>
                <li><Link to="aboutus">За нас</Link></li>
                
            </ul>
            <button className="firstButton" id="fundMe">Дари</button>
            </div>
        </nav>
    )
}

export default Navigation