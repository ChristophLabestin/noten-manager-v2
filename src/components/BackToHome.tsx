import backIcon from "../assets/back.svg";

export default function BackToHome() {
    const navigateToHome = () => {
        window.location.href = "/";
    }

    return (
        <div className="back-to-home-wrapper" onClick={navigateToHome}>
            <img src={backIcon}/> 
            <p className="back-to-home-text">zur Startseite</p>
        </div>
    )
}