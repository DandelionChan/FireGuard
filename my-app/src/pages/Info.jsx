import { useState, useEffect } from "react";
import information from "./info.json";
import Navigation from "../homeFiles/Navigation";
import Footer from "../homeFiles/Footer";


const Info = () => {
  console.log(information);

  return (
    <>
    <Navigation />
      {information.videosInfo.map((e, index) => (
        <div key={index} className="info-section" style={{ backgroundColor: e.color }}>
          <h1 className="infoHeading" style={{ color: e.titleColor }}>{e.heading}</h1>
          <p className="paragraphInfo paddingSides" style={{ color: e.bodyColor }}>{e.paragraph}</p>
          <div className="centerVideo">
          <video className="video-container" width="800" height="393" controls>
           <source src={e.videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        </div>
      ))}
    <Footer />
    </>
  );
};

export default Info;
