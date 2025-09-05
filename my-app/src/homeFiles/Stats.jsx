import { fetchStats } from "../api";
import { useQuery } from "@tanstack/react-query";
{/*import { useEffect, useState } from "react";*/}

const Stats = () => {

   const {
    data: statsList = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats("stats"),
    refetchInterval: 5000,
  });

   {/* useEffect(() => {
    fetchStats("stats").then(setStats).catch(console.error);
    }, []);*/}
    
     /*if (isLoading) return <p>Loading...</p>;
     if (isError) return <p>Something went wrong.</p>;*/

    return (
        <>
        <h3 className="centeredTitle">Interesting Stats</h3>
        <p className="centeredText">Rhoncus morbi et augue nec, in id ullamcorper at sit. Condimentum sit nunc in eros scelerisque sed. Commodo in viverra nunc, ullamcorper ut. Non, amet, aliquet scelerisque nullam sagittis, pulvinar. Fermentum scelerisque sit consectetur hac mi. Mollis leo eleifend ultricies purus iaculis.</p>
        <ul>
            {statsList.map((stat) => (
                <li key={stat.id}>
                    <img src={stat.src}></img>
                    <p>{}</p>
                </li>
            ))}
        </ul>
        </>
    )
}

export default Stats;