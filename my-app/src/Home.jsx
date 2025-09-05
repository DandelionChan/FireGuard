import Navigation from "./homeFiles/Navigation";
import Head from "./homeFiles/Head";
import Map from "./homeFiles/Map";
import VolunteersInfo from "./homeFiles/VolunteersInfo";
import Funds from "./homeFiles/Funds";
import Footer from "./homeFiles/Footer";
import Videoinfo from "./videosinfo";



const Home = () => {
    return (
        <>
       <Navigation />
       <Head />
       <Map />
       <VolunteersInfo />
       <Videoinfo />
       <Funds />
       <Footer />
        </>
    )
}

export default Home