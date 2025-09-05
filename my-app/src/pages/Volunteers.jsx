import Navigation from "../homeFiles/Navigation";
import Head from "../homeFiles/Head";
import VolunteersCard from "../volunteersFiles/VolunteersCard";
import { useState, useEffect } from "react";

const Volunteers = () => {
    const [cards, setCards] = useState([]);

    useEffect(() => {
    fetch("../cards.json")
      .then((res) => res.json())
      .then((data) => setCards(data))
      .catch((err) => console.error("Error loading cards:", err));
  }, []);

    return (
        <>
         <Navigation />
         <Head />
         <h2 className="center">Какво означава да си доброволец?</h2>
         <div className="flexContainer">
        {cards.map((card, index) => (
        <VolunteersCard
          key={index}
          title={card.title}
          body={card.body}
          imgSrc={card.imgSrc}
          alt={card.alt}
        />
      ))}
         </div>
        </>
    )
}

export default Volunteers