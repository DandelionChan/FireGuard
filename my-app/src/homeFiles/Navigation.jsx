import { Link } from 'react-router-dom';

const Navigation = () => {
    return (
        <nav className="mainNavigation flexContainer sidePadding">
            <img src="src/assets/Group 7.png" alt="logo"></img>
            <div className="flexContainer">
            <ul className="navigationList">
                <li><Link to="/">Начало</Link></li>
                <li><Link to="/volunteers">Доброволци</Link></li>
                <li><Link to="/map">Карта</Link></li>
                <li><Link to="/info">Информация</Link></li>
                <li><Link to="/aboutus">За нас</Link></li>
                <li><Link to="/contactUs">Контакти</Link></li>                
            </ul>
            <a className="firstButton" style={{textDecoration: "none"}} href='https://donate.stripe.com/test_28E9AU2uo91T7qgblL1kA01' id="fundMe">Дари</a>
            </div>
        </nav>
    )
}

export default Navigation