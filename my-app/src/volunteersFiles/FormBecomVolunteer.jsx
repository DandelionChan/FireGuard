import { useState } from "react";

const FormBecomeVolunteer = () => {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        skills: "",
    });

    const [responseMsg, setResponseMsg] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

    const response = await fetch("#", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

     const result = await response.json();
     setResponseMsg(result.message || "Submitted successfully!");
     setFormData({ name: "", email: "", phone: "", skills: "" }); 

    }

        return (
            <form onSubmit={handleSubmit}>
                <label className="">Full Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className=""
                />
                <label className="">Email</label>
                <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className=""
                />
        <button
          type="submit"
          className=""
        >
          Submit
        </button>
            </form>
        )

    }
export default FormBecomeVolunteer