const Footer = () => {
    return (
        <footer>
            <div className="center">
                <div className="flexColumn paddingSides footer">
                    <div>
                        <ul className="flexContainer">
                            <li>Начало</li>
                            <li>Доброволци</li>
                            <li>Карта</li>
                            <li>Информация</li>
                        </ul>
                    </div>
                    <div>
                        <ul className="flexContainer smMargin"> 
                            <li><img src="src/assets/li.png" alt="YouTube"/></li>
                            <li><img src="src/assets/li.png" alt="facebook"/></li>
                            <li><img src="src/assets/li.png" alt="twitter"/></li>
                            <li><img src="src/assets/li.png" alt="instagram"/></li>
                             <li><img src="src/assets/li.png" alt="LinkedIn"/></li>
                        </ul>
                    </div>
                    {/* add  */}
                    <p className="center copyright">Bulgarian Fire Volunteers @ 202X. All rights reserved.</p>
                    {/* add  */}
                </div>
            </div>
        </footer>
    )
}

export default Footer