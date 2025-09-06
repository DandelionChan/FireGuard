const FormSignalFire = () => {
  const [formData, setFormData] = useState({
    whereAbouts: ""
  });
  const [file, setFile] = useState(null); 
  const [responseMsg, setResponseMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("whereAbouts", formData.whereAbouts);
    if (file) {
      data.append("picture", file);
    }

    try {
      const response = await fetch("http://localhost:5000/api", {
        method: "POST",
        body: data, 
      });

      const result = await response.json();
      setResponseMsg(result.message || "Успешно подадохте сигнал за пожара! Благодарим ви!!!");
      setFormData({whereAbouts: "", size: ""});
      setFile(null);
    } catch (error) {
      setResponseMsg("Възникна грешка при подаването на сигнала");
      console.error(error);
    }
}
    return (
            <>
            <form onSubmit={handleSubmit}>
                <label className="">Местоположние</label>
                <input
                    type="text"
                    name="whereAbouts"
                    value={formData.whereAbouts}
                    onChange={handleChange}
                    required
                    className=""
                />
                <label className="">Размер на пожара</label>
                <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    required
                    className=""
                />
                 <input type="file" onChange={handleFileChange} accept="image/*" />
        <button
          type="submit"
          className=""
        >Submit
        </button>  
        {responseMsg && <p className="">{responseMsg}</p>}
        </form>
         </>
    )

}

export default FormSignalFire