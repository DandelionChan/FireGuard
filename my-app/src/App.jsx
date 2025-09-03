import { useState } from 'react';
import './App.css';
import { Routes, Route } from "react-router-dom";
import Home from './Home';
import Volunteers from './Volunteers';
import Info from './Info';
import AboutUs from './AboutUs';

function App() {
  const apiUrl = import.meta.env.VITE_APP_API_URL;
  /*fetch function */
  /*crud */

   return (

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/volunteers" element={<Volunteers />} />
      <Route path="/info" element={<Info />} />
      <Route path="/aboutus" element={<AboutUs />} />
    </Routes>
  );

  
}

export default App
