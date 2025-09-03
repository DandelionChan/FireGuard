import { Link } from 'react-router-dom';

const Navigation = () => {
    return (
        <nav className="mainNavigation flexContainer border">
            <img src="#" alt="logo"></img>
            <div className="flexContainer">
            <ul className="border navigationList">
                <li><Link to="/">Home</Link></li>
                <li><Link to="volunteers">Volunteers</Link></li>
                <li><Link to="info">Info</Link></li>
                <li><Link to="aboutus">About us</Link></li>
                
            </ul>
            <button className="border">Fund me</button>
            </div>
        </nav>
    )
}

export default Navigation