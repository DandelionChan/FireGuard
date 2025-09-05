import Navigation from "../homeFiles/Navigation";
import Head from "../homeFiles/Head";
import VolunteersInfo from "../homeFiles/VolunteersInfo";
import Funds from "../homeFiles/Funds";
import Footer from "../homeFiles/Footer";
import Stats from "../homeFiles/Stats";
import CenteredText from "../components/centeredText";
import Partners from "../homeFiles/Partners";

const Home = () => {
    return (
        <>
       <Navigation />
       <Head />
       <CenteredText />
       <VolunteersInfo />
       <Stats />
       <Partners />
       <Funds />
       <Footer />
        </>
    )
}

export default Home