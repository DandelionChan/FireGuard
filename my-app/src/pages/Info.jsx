
import { useState, useEffect } from "react";
import information from "./info.json";


const Info = () => {
  console.log(information);

  return (
    <>
      {information.videosInfo.map((e, index) => (
        <div key={index} className="info-section">
          <h1 className="infoHeading">{e.heading}</h1>
          <p className="paragraphInfo">{e.paragraph}</p>
          <video className="video-container" width="320" height="240" controls>
           <source src={e.videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      ))}
    </>
  );
};

export default Info;
