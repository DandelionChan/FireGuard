// import { useState } from 'react';
import './App.css';
import './aboutus.css';
import { Routes, Route } from "react-router-dom";
import Home from './Home';
import Volunteers from '././Volunteers';
import Info from './Info';
import AboutUs from './AboutUs';
import ContactUs from './ContactUs';
import MapPage from './Map';

// import { useQuery } from "@tanstack/react-query";

function App() {

   return (

    <Routes>
      <Route path="/" element={<Home 
      />} />
      <Route path="/volunteers" element={<Volunteers />} />
      <Route path="/info" element={<Info />} />
      <Route path="/aboutus" element={<AboutUs />} />
      <Route path="/contactUs" element={<ContactUs/>} />
      <Route path="/map" element={<MapPage />} />
    </Routes>
  );

  
}

export default App
