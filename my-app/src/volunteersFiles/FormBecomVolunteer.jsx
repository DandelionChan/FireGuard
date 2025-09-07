import { useState } from "react";
import "./FormBecomVolunteer.css";

const FormBecomeVolunteer = () => {
    const API_URL = "http://localhost:3000/volunteers";

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        city: "",
    });

    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [responseMsg, setResponseMsg] = useState("");
    const [responseType, setResponseType] = useState(""); // 'success' | 'error' | ''

    const nameRegex = /^[A-Za-zА-Яа-яЁёІіЇїЄє'’\-\s]{2,}$/;
    const cityRegex = /^[A-Za-zА-Яа-яЁёІіЇїЄє'’\-\s]{2,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const validate = (values, currentFile) => {
        const newErrors = {};
        if (!values.firstName || !nameRegex.test(values.firstName)) {
            newErrors.firstName = "Моля, въведете валидно име (мин. 2 символа)";
        }
        if (!values.lastName || !nameRegex.test(values.lastName)) {
            newErrors.lastName = "Моля, въведете валидна фамилия (мин. 2 символа)";
        }
        if (!values.email || !emailRegex.test(values.email)) {
            newErrors.email = "Моля, въведете валиден имейл";
        }
        const digits = (values.phoneNumber || "").replace(/[^0-9]/g, "");
        if (!values.phoneNumber || digits.length < 7 || digits.length > 15) {
            newErrors.phoneNumber = "Моля, въведете валиден телефонен номер";
        }
        if (!values.city || !cityRegex.test(values.city)) {
            newErrors.city = "Моля, въведете валиден град";
        }
        const f = currentFile;
        if (!f) {
            newErrors.file = "Моля, прикачете сертификат (изображение или PDF)";
        } else {
            const allowed = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "application/pdf",
            ];
            if (!allowed.includes(f.type)) {
                newErrors.file = "Невалиден формат. Разрешени: JPEG, PNG, WEBP, PDF";
            }
            const maxBytes = 5 * 1024 * 1024; // 5MB
            if (f.size > maxBytes) {
                newErrors.file = "Файлът е твърде голям (макс. 5MB)";
            }
        }
        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (touched[name]) {
            setErrors(validate({ ...formData, [name]: value }, file));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        setErrors(validate(formData, file));
    };

    const handleFileChange = (e) => {
        const selected = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        setFile(selected);
        setTouched((prev) => ({ ...prev, file: true }));
        setErrors(validate(formData, selected));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResponseMsg("");
        setResponseType("");
        setTouched({ firstName: true, lastName: true, email: true, phoneNumber: true, city: true, file: true });
        const validation = validate(formData, file);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;

        const data = new FormData();
        data.append("firstName", formData.firstName.trim());
        data.append("lastName", formData.lastName.trim());
        data.append("email", formData.email.trim());
        data.append("phoneNumber", formData.phoneNumber.trim());
        data.append("city", formData.city.trim());
        if (file) data.append("file", file);

        setSubmitting(true);
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: data,
            });

            let resultMsg = "Успешна регистрация!";
            if (!response.ok) {
                try {
                    const err = await response.json();
                    resultMsg = err?.message || `Грешка: ${response.status}`;
                } catch (_) {
                    resultMsg = `Грешка: ${response.status}`;
                }
                setResponseMsg(resultMsg);
                setResponseType("error");
                return;
            }

            try {
                const result = await response.json();
                resultMsg = result?.message || resultMsg;
            } catch (_) {}

            setResponseMsg(resultMsg);
            setResponseType("success");
            setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "", city: "" });
            setFile(null);
            setErrors({});
            setTouched({});
        } catch (err) {
            setResponseMsg("Мрежова грешка. Опитайте отново.");
            setResponseType("error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="rel">
                <div className="formVolText">
                            <form onSubmit={handleSubmit} noValidate encType="multipart/form-data" className="VolunteerForm rightHeaderTextVol ">
                                <div className="flexColumns">
                                    <div className="flexRows">
                                        <div className="flexColumns">
                                            <label className="normalLabel">Име</label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                                aria-invalid={touched.firstName && !!errors.firstName}
                                                aria-describedby={touched.firstName && errors.firstName ? "firstName-error" : undefined}
                                                className={`smallInput ${touched.firstName && errors.firstName ? "input-error" : ""}`}
                                            />
                                            {touched.firstName && errors.firstName && (
                                                <span id="firstName-error" className="field-error">{errors.firstName}</span>
                                            )}
                                        </div>
                                        <div className="flexColumns">
                                            <label className="normalLabel">Фамилия</label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                                aria-invalid={touched.lastName && !!errors.lastName}
                                                aria-describedby={touched.lastName && errors.lastName ? "lastName-error" : undefined}
                                                className={`smallInput ${touched.lastName && errors.lastName ? "input-error" : ""}`}
                                            />
                                            {touched.lastName && errors.lastName && (
                                                <span id="lastName-error" className="field-error">{errors.lastName}</span>
                                            )}
                                        </div>
                                    </div>
                                    <label className="normalLabel">Имейл</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        required
                                        aria-invalid={touched.email && !!errors.email}
                                        aria-describedby={touched.email && errors.email ? "email-error" : undefined}
                                        className={`longInput ${touched.email && errors.email ? "input-error" : ""}`}
                                    />
                                    {touched.email && errors.email && (
                                        <span id="email-error" className="field-error">{errors.email}</span>
                                    )}
                                    <label className="normalLabel">Телефонен номер</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        inputMode="tel"
                                        maxLength={20}
                                        required
                                        aria-invalid={touched.phoneNumber && !!errors.phoneNumber}
                                        aria-describedby={touched.phoneNumber && errors.phoneNumber ? "phone-error" : undefined}
                                        className={`longInput ${touched.phoneNumber && errors.phoneNumber ? "input-error" : ""}`}
                                    />
                                    {touched.phoneNumber && errors.phoneNumber && (
                                        <span id="phone-error" className="field-error">{errors.phoneNumber}</span>
                                    )}
                                    <label className="normalLabel">Град</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        required
                                        aria-invalid={touched.city && !!errors.city}
                                        aria-describedby={touched.city && errors.city ? "city-error" : undefined}
                                        className={`longInput ${touched.city && errors.city ? "input-error" : ""}`}
                                    />
                                    {touched.city && errors.city && (
                                        <span id="city-error" className="field-error">{errors.city}</span>
                                    )}
                                    <label className="normalLabel">Прикачи сертификат</label>
                                    <div className="file-upload">
                                        <input
                                            type="file"
                                            id="fileInput"
                                            onChange={handleFileChange}
                                            accept="image/*,.pdf"
                                            multiple={false}
                                            className="file-upload"
                                        />
                                        <label htmlFor="fileInput" className={`file-dropzone ${touched.file && errors.file ? "input-error" : ""}`}>
                                            <span className="file-icon">⬇️</span>
                                            <p id="chooseFile">{file ? file.name : "Choose a file or drag it here"}</p>
                                        </label>
                                        {touched.file && errors.file && (
                                            <span id="file-error" className="field-error">{errors.file}</span>
                                        )}
                                    </div>
                                    {responseMsg && (
                                        <p
                                            className={`form-message ${responseType}`}
                                            role="status"
                                            aria-live={responseType === "error" ? "assertive" : "polite"}
                                        >
                                            {responseMsg}
                                        </p>
                                    )}
                                    <button
                                        type="submit"
                                        className="firstButton"
                                        id="register"
                                        disabled={submitting}
                                    >Регистрирай се
                                    </button>
                                </div>
                            </form>
                        </div>
                        <img src="src/assets/blue gradient.png" className="formRightBlueGradient" />
                    <img src="src/assets/heart.jpg" alt="Become a volunteer" className="rightFormGogi"></img>
                </div>
        </>
    )

}
export default FormBecomeVolunteer
