import { useState } from "react";

const FormBecomeVolunteer = () => {

    const [formData, setFormData] = useState({
        firstName: "",
        familyName: "",
        email: "",
        phone: "",
        city: ""
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

    const data = new FormData();
    data.append("firstName", formData.firstName);
    data.append("familyName", formData.familyName);
    data.append("email", formData.email);
    data.append("phone", formData.phone);
    data.append("city", formData.city);
    if (file) {
        data.append("picture", file);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const response = await fetch("http://localhost:5000/volunteers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const result = await response.json();
        setResponseMsg(result.message || "Submitted successfully!");
        setFormData({ firstName: "", familyName: "", email: "", phone: "", city: "" });

    }

    return (
        <>
            <div className="rel">
                <div className="formVolText">
                            <form onSubmit={handleSubmit} className="VolunteerForm rightHeaderTextVol ">
                                <div className="flexColumns">
                                    <div className="flexRows">
                                        <div className="flexColumns">
                                            <label className="normalLabel">Име</label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                required
                                                className="smallInput"
                                            />
                                        </div>
                                        <div className="flexColumns">
                                            <label className="normalLabel">Фамилия</label>
                                            <input
                                                type="text"
                                                name="familyName"
                                                value={formData.familyName}
                                                onChange={handleChange}
                                                required
                                                className="smallInput"
                                            />
                                        </div>
                                    </div>
                                    <label className="normalLabel">Имейл</label>
                                    <input
                                        type="text"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="longInput"
                                    />
                                    <label className="normalLabel">Телефонен номер</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        className="longInput"
                                    />
                                    <label className="normalLabel">Град</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required
                                        className="longInput"
                                    />
                                    <label className="normalLabel">Прикачи сертификат</label>
                                    <div className="file-upload">
                                        <input
                                            type="file"
                                            id="fileInput"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            multiple={false}
                                            className="file-upload"
                                        />
                                        <label htmlFor="fileInput" className="file-dropzone">
                                            <span className="file-icon">⬇️</span>
                                            <p id="chooseFile">Choose a file or drag it here</p>
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        className="firstButton"
                                        id="register"
                                    >Регистрирай се
                                    </button>
                                </div>
                            </form>
                            {responseMsg && <p className="">{responseMsg}</p>}
                        </div>
                        <img src="src/assets/blue gradient.png" className="formRightBlueGradient" />
                    <img src="src/assets/heart.jpg" alt="Become a volunteer" className="rightFormGogi"></img>
                </div>
        </>
    )

}
export default FormBecomeVolunteer