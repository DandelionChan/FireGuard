import Navigation from "../homeFiles/Navigation";
import VolunteersHelp  from "../volunteersFiles/volunteersHelp";
import VolunteersCard from "../volunteersFiles/VolunteersCard";
import { useState, useEffect } from "react";
import FormBecomeVolunteer from "../volunteersFiles/FormBecomVolunteer";
import HeadVolunteers from "../volunteersFiles/HeadVolunteers";
import WhyShouldYouBeAVolunteer from "../volunteersFiles/WhyShouldYouBeAVolunteer";
import LightBlue from "../volunteersFiles/ligthBlue";
import Footer from "../homeFiles/Footer";

const Volunteers = () => {
  //   const [cards, setCards] = useState([]);

  //   useEffect(() => {
  //   fetch("../cards.json")
  //     .then((res) => res.json())
  //     .then((data) => setCards(data))
  //     .catch((err) => console.error("Error loading cards:", err));
  // }, []);

    return (
        <div>
         <Navigation />
         <HeadVolunteers />
         <h2 className="Component">Защо да станеш доброволец?</h2>
        <WhyShouldYouBeAVolunteer />
        <FormBecomeVolunteer />
       <LightBlue />
        <VolunteersHelp />
        <Footer />
        </div>
    )
}

export default Volunteers