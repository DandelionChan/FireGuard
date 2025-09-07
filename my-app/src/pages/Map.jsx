import Navigation from "../homeFiles/Navigation";
import Footer from "../homeFiles/Footer";
import WildfireMap from "../components/WildfireMap";

const MapPage = () => {
  return (
    <>
      <Navigation />
      <div style={{ height: "100vh" }}>
        <WildfireMap />
      </div>
      <Footer />
    </>
  );
};

export default MapPage;

