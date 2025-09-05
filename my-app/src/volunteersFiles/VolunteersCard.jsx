const VolunteersCard = ({title, body, imgSrc, alt}) => {
    return (
        <div className="card border gridColumnCard">
            <img src={imgSrc} alt={alt} className="center"></img>
            <h3 className="center">{title}</h3>
            <p className="centervertically">{body}</p>
        </div>
    )
}

export default VolunteersCard