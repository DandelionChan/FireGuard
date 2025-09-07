const VolunteersCard = ({body, imgSrc, alt}) => {
    return (
        <div className="flexWhyShould centered" style={{width: "100%"}}>
            <div className="flexRow">
                <img src={imgSrc} alt={alt} className="blueCircle"/>
                <p className="pBlueCircle">{body}</p>
            </div>
        </div>
    )
}

export default VolunteersCard

