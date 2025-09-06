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
<div className="statsFlex">
        <div className="blueRect"></div>
        <div className="blueRect"></div>
        <div className="blueRect"></div>
        <div className="blueRect"></div>
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