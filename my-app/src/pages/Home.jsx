import Navigation from "../homeFiles/Navigation";
import Head from "../homeFiles/Head";
import VolunteersInfo from "../homeFiles/VolunteersInfo";
import Funds from "../homeFiles/Funds";
import Footer from "../homeFiles/Footer";
import Stats from "../homeFiles/Stats";
import CenteredText from "../components/centeredText";
import Partners from "../homeFiles/Partners";
import { useState, useEffect } from "react";
import VideoPageInfo from "../homeFiles/VideoPageInfo";
import WhyAreWeHere from "../homeFiles/WhyAreWeHere";
import { Link } from "react-router-dom";
import FormSignalFire from "../SignalFireFiles/FormSignalFire";

const Home = () => {
    return (
        <>
       <Navigation />
       <Head />
       <CenteredText />
       <FormSignalFire />
       <div className="filler"></div>
       <VolunteersInfo />
       <Stats />
       <div className="filler"></div>
       <VideoPageInfo />
       
       <Funds />
       <div className="centered">
       <button className="firstButton">Дарете сега </button>
       </div>
       <div className="filler"></div>
       <Partners />
       <WhyAreWeHere />
       <Footer />
        </>
    )
}

export default Home
