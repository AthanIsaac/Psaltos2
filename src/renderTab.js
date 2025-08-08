import Resurrection from "./img/resurrection.jpg";
import Theophany from "./img/tasbeha.jpg";
import Apostles from "./img/apostles.jpg";
import SundayTesbaha from "./img/tasbeha.jpg";
import Nativity from "./img/Nativity.jpg";
import mikhailGirgis from "./img/profiles/MikhailGirgis.jpeg";
import Robe from "./img/icons/robe.js";
import ArtistIcon from "./img/icons/artistIcon.js";
import Cross from "./img/icons/cross.js";
import { useState } from "react";

const artistEdit = (hymn) => hymn?.artist?.substring(7) || hymn?.artist || "";

const HeaderComponent = ({ placeHolder }) => (
    <div className="headerContainer">
        <Cross />
        <h1>{placeHolder}</h1>
        <Cross />
    </div>
);

export const CantorTab = ({ artists }) => {
    const [click, setClick] = useState(0);

    const nextFour = () => {
        setClick((prevClick) => Math.min(prevClick + 4, artists.length - 4));
    };

    const prevFour = () => {
        setClick((prevClick) => Math.max(prevClick - 4, 0));
    };

    return (
        <div className="TabList">
            <span>
                <HeaderComponent placeHolder="Cantors" />
                <p>Choose a Coptic deacon to enrich your spiritual journey with traditional hymns</p>
            </span>
            <span>
                {click > 0 && (
                    <svg className="leftArrow" onClick={prevFour} width="22" height="32" viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
                        <path d="M1.05873 17.5848C0.0187157 16.7842 0.0187151 15.2158 1.05873 14.4152L18.28 1.15824C19.5951 0.145845 21.5 1.08337 21.5 2.74305V29.2569C21.5 30.9166 19.5951 31.8542 18.28 30.8418L1.05873 17.5848Z" />
                    </svg>
                )}

                <div className="list">
                    {artists.slice(click, click + 4).map((artist, index) => (
                        <div key={index} onClick={() => console.log(`Selected: ${artist}`)} className="artist-card">
                            <div className="cantorContainer">
                                <div className="topRow">{profilePic(artist)}</div>
                                <div className="artist">
                                    <span>
                                        <ArtistIcon />
                                        <p>CANTOR</p>
                                    </span>
                                    <b>{artist}</b>
                                </div>
                            </div>
                            <Robe />
                        </div>
                    ))}
                </div>

                {click + 4 < artists.length && (
                    <svg className="rightArrow" onClick={nextFour} width="22" height="32" viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
                        <path d="M1.05873 17.5848C0.0187157 16.7842 0.0187151 15.2158 1.05873 14.4152L18.28 1.15824C19.5951 0.145845 21.5 1.08337 21.5 2.74305V29.2569C21.5 30.9166 19.5951 31.8542 18.28 30.8418L1.05873 17.5848Z" />
                    </svg>
                )}
            </span>
        </div>
    );
};

export const searchItem = ({ hymn }) => (
    <div className="searchItem" onClick={() => console.log(`Searching: ${hymn.name}`)}>
        <div className="cantorContainer">
            <div className="topRow">
                <HeaderComponent placeHolder={hymn.name} />
            </div>
            <div className="artist">
                <span>
                    <ArtistIcon />
                    <p>CANTOR</p>
                </span>
                <b>{artistEdit(hymn)}</b>
            </div>
        </div>
    </div>
);

export const profilePic = (artist) => {
    switch (artist) {
        case "Cantor Mikhail Girgis Elbatanony":
            return <img src={mikhailGirgis} alt="Cantor Mikhail" />;
        case "Cantor Ibrahim Ayad":
            return <img src={Nativity} alt="Cantor Ibrahim" />;
        default:
            return <img src={mikhailGirgis} alt="Cantor Default" />;
    }
};

export const RenderTab = ({ filteredHymns }) => {
    const renderHymns = () => {
        return filteredHymns.map((selectedHymn, index) => (
            <div key={index} className="hymn-item" onClick={() => console.log(`Selected Hymn: ${selectedHymn.name}`)}>
                <div className="cantorContainer">
                    <div className="topRow">{profilePic(selectedHymn.artist)}</div>
                    <div className="artist">
                        <span>
                            <ArtistIcon />
                            <p>CANTOR</p>
                        </span>
                        <b>{artistEdit(selectedHymn)}</b>
                    </div>
                </div>
                <Robe />
            </div>
        ));
    };

    return <>{renderHymns()}</>;
};

export const seasonRender = ({ seasons }) => {
    return (
        <div className="seasonContainer">
            {seasons.map((season, index) => (
                <div key={index} className="seasonItem">
                    {index === 0 && <img src={Nativity} alt="Nativity Season" />}
                    {index === 1 && <img src={Resurrection} alt="Resurrection Season" />}
                    {index === 2 && <img src={Theophany} alt="Theophany Season" />}
                    {index === 3 && <img src={Apostles} alt="Apostles Fast Season" />}
                    {index === 4 && <img src={SundayTesbaha} alt="Sunday Tasbeha (Midnight Praises)" />}
                    <HeaderComponent placeHolder={season} />
                </div>
            ))}
        </div>
    );
};