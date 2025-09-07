// import { fetchStats } from "../api";
// import { useQuery } from "@tanstack/react-query";

const Stats = () => {

//    const {
//     data: statsList = [],
//     isLoading,
//     isError,
//   } = useQuery({
//     queryKey: ["stats"],
//     queryFn: () => fetchStats(stat.id),
//     refetchInterval: 5000,
//   });
return (
        <>
        <div className="centeredTextComponent paddingSides">
        <h2 className="centered">Нашето въздействие в числа</h2>
        <p className="centered">Всеки сигнал, всяка снимка и всяко действие правят разликата. Вярваме, че реалните резултати показват силата на 
общността и партньорството с институциите.</p>
</div>
{/* add later */}
<div className="statsFlex">
        <div className="blueRect centered">
            <h3>250+</h3>
            <p>снимки качени от 
доброволци и граждани</p>
        </div>
        <div className="blueRect centered">
              <h3>15 общини</h3>
            <p>15 общини, които работят 
с нас активн</p>
        </div>
        <div className="blueRect centered">
              <h3>500+</h3>
            <p>регистрирани доброволци, 
готови да реагират</p>
        </div>
        <div className="blueRect centered">
              <h3>700+</h3>
            <p>хора, които 
вече използват картата</p>
        </div>
        {/* add later end */}
</div>
        {/* <ul>
            {statsList.map((stat) => (
                <li key={stat.id}>
                    <div className="blueRect"></div>
                </li>
            ))}
        </ul> */}
        </>
    )
}

export default Stats;