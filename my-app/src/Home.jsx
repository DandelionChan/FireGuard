import Navigation from "./homeFiles/Navigation";
import Head from "./homeFiles/Head";
import Map from "./homeFiles/Map";
import VolunteersInfo from "./homeFiles/VolunteersInfo";
import Funds from "./homeFiles/Funds";
import Footer from "./homeFiles/Footer";

const Home = () => {
    return (
        <>
       <Navigation />
       <Head />
       <Map />
       <VolunteersInfo />
       
       <Funds />
       <Footer />
        </>
    )
}

export default Home