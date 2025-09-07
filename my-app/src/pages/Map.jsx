import Navigation from "../homeFiles/Navigation";
import Footer from "../homeFiles/Footer";
import WildfireMap from "../components/WildfireMap";
import '../index.css';

const MapPage = () => {
  return (
    <>
    <style></style>
      <Navigation />
      <div className="wildfire-theme" style={{ height: "100vh", position: "relative" }}>
        <WildfireMap />
      </div>
      <Footer />
    </>
  );
};

export default MapPage;

