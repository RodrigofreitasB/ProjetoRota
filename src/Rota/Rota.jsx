import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import './Rota.css';
import { FaCar } from "react-icons/fa";
import { FaPersonWalking } from "react-icons/fa6";
import { MdDirectionsBike } from "react-icons/md";
import { IoChevronDown, IoChevronUp, IoLogOutOutline } from "react-icons/io5";
import { signOut } from "firebase/auth";
import { auth } from "../login/firebase";
import { useNavigate } from "react-router-dom";
import { IoIosArrowUp } from "react-icons/io";

mapboxgl.accessToken = "pk.eyJ1Ijoicm9kcmlnb2ZyZWl0YXNiIiwiYSI6ImNtaWVuZ2p5NjA0c2szZHB2cXUybTFwOHEifQ.GzJMK5FTXNRgVhE0QfSTbg";

function Rota() {
    const [origem, setOrigem] = useState("");
    const [destino, setDestino] = useState("");
    const [modo, setModo] = useState("driving");
    const [sugestoesOrigem, setSugestoesOrigem] = useState([]);
    const [sugestoesDestino, setSugestoesDestino] = useState([]);
    const [instrucoes, setInstrucoes] = useState([]);
    const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
    const mapaRef = useRef(null);
    const [expandido, setExpandido] = useState(false);
    const [rotaExpandida, setRotaExpandida] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null); // { duration: number, distance: number }
    const navigate = useNavigate();

    const [checkedSteps, setCheckedSteps] = useState({});

    useEffect(() => {
        if (rotaExpandida) {
            document.body.classList.add("no-scroll");
        } else {
            document.body.classList.remove("no-scroll");
        }
    }, [rotaExpandida]);

    // Buscar sugestões conforme a pessoa digita
    const buscarSugestoes = async (texto, tipo) => {
        if (texto.length < 3) {
            if (tipo === "origem") setSugestoesOrigem([]);
            else setSugestoesDestino([]);
            return;
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(texto)}.json?access_token=${mapboxgl.accessToken}&country=BR&language=pt&limit=5`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (tipo === "origem") {
                setSugestoesOrigem(data.features || []);
            } else {
                setSugestoesDestino(data.features || []);
            }
        } catch (error) {
            console.error("Erro ao buscar sugestões:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    };

    const selecionarSugestao = (sugestao, tipo) => {
        if (tipo === "origem") {
            setOrigem(sugestao.place_name);
            setSugestoesOrigem([]);
        } else {
            setDestino(sugestao.place_name);
            setSugestoesDestino([]);
        }
    };

    const buscarRota = async () => {
        if (!origem || !destino) {
            alert("Por favor, preencha origem e destino");
            return;
        }

        try {
            // 1. Obter coordenadas da origem
            const coordOrigem = await getCoordenada(origem);
            // 2. Obter coordenadas do destino
            const coordDestino = await getCoordenada(destino);
            // 3. Buscar a rota com instruções detalhadas
            const rotaCompleta = await getRota(coordOrigem, coordDestino, modo);

            // 4. Desenhar a rota no mapa
            desenharRota(rotaCompleta.geometry);

            // 5. Extrair as instruções passo a passo
            extrairInstrucoes(rotaCompleta);

            // 6. Ajustar o zoom do mapa para mostrar toda a rota
            ajustarZoom(coordOrigem, coordDestino);

            // Expandir o card para mostrar as instruções
            setRotaExpandida(true);

        } catch (error) {
            console.error("Erro ao buscar rota:", error);
            alert("Erro ao calcular a rota. Verifique os endereços.");
        }
    };

    async function getCoordenada(endereco) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(endereco)}.json?access_token=${mapboxgl.accessToken}&country=BR&limit=1`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            throw new Error("Endereço não encontrado");
        }

        return data.features[0].center; // [longitude, latitude]
    }

    async function getRota(origemCoord, destinoCoord, modo) {
        // IMPORTANTE: adicionar steps=true, banner_instructions=true e voice_instructions=true
        const url = `https://api.mapbox.com/directions/v5/mapbox/${modo}/${origemCoord[0]},${origemCoord[1]};${destinoCoord[0]},${destinoCoord[1]}?geometries=geojson&steps=true&banner_instructions=true&voice_instructions=true&language=pt&access_token=${mapboxgl.accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error("Nenhuma rota encontrada");
        }

        return data.routes[0];
    }

    // Helper to format duration
    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}min`;
    };

    // Helper to format distance
    const formatDistance = (meters) => {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    };

    function desenharRota(geometry) {
        const mapa = mapaRef.current;

        // Remove a rota anterior se existir
        if (mapa.getSource("rota")) {
            mapa.removeLayer("rota");
            mapa.removeSource("rota");
        }

        // Adiciona a nova rota
        mapa.addLayer({
            id: "rota",
            type: "line",
            source: {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: geometry
                }
            },
            paint: {
                "line-width": 6,
                "line-color": "#3b82f6" // Blue matching theme
            }
        });
    }

    function extrairInstrucoes(rota) {
        const todasInstrucoes = [];

        rota.legs.forEach((leg) => {
            leg.steps.forEach((step) => {
                todasInstrucoes.push({
                    instrucao: step.maneuver.instruction,
                });
            });
        });

        setInstrucoes(todasInstrucoes);
        setRouteInfo({
            duration: rota.duration,
            distance: rota.distance
        });
        setMostrarInstrucoes(true);
        setCheckedSteps({}); // Reset checkboxes
        setExpandido(false); // Start collapsed on mobile
    }


    function ajustarZoom(coordOrigem, coordDestino) {
        const mapa = mapaRef.current;

        // Criar um "bounding box" que contenha origem e destino
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(coordOrigem);
        bounds.extend(coordDestino);

        // Ajustar o mapa para mostrar toda a área
        mapa.fitBounds(bounds, {
            padding: 100, // espaço ao redor
            maxZoom: 15 // zoom máximo
        });
    }

    const toggleStep = (index) => {
        setCheckedSteps(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const allStepsChecked = instrucoes.length > 0 && instrucoes.every((_, index) => checkedSteps[index]);

    // Find the first unchecked instruction for the mobile summary
    const currentInstructionIndex = instrucoes.findIndex((_, index) => !checkedSteps[index]);
    const currentInstruction = currentInstructionIndex !== -1 ? instrucoes[currentInstructionIndex] : instrucoes[instrucoes.length - 1];

    useEffect(() => {
        const map = new mapboxgl.Map({
            container: "map",
            style: "mapbox://styles/mapbox/dark-v10", // Dark style
            center: [-46.6333, -23.5505], // São Paulo
            zoom: 12
        });

        mapaRef.current = map;

        // Limpar o mapa quando o componente for desmontado
        return () => map.remove();
    }, []);

    return (
        <div className="rota-container">
            {/* Mapa Background */}
            <div id="map" className="rota-map-container"></div>

            {/* Logout Button */}
            <button className="rota-logout-button" onClick={handleLogout} title="Sair">
                <IoLogOutOutline size={24} />
            </button>


            <div className="rota-cards-container">
                {/* Card de Input */}

                <div className={`rota-card rota-input-card  ${rotaExpandida ? 'rota-card-expandido' : ''}`}>

                    {/* Campo de Origem */}
                    <div className="rota-input-group">
                        <label className="rota-input-label">Origem</label>
                        <input
                            type="text"
                            className="rota-input-field"
                            placeholder="Ponto de partida"
                            value={origem}
                            onChange={(e) => {
                                setOrigem(e.target.value);
                                buscarSugestoes(e.target.value, "origem");
                            }}
                        />
                        {sugestoesOrigem.length > 0 && (
                            <div className="rota-suggestions-list">
                                {sugestoesOrigem.map((sugestao, index) => (
                                    <div
                                        key={index}
                                        className="rota-suggestion-item"
                                        onClick={() => selecionarSugestao(sugestao, "origem")}
                                    >
                                        {sugestao.place_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Campo de Destino */}
                    <div className="rota-input-group">
                        <label className="rota-input-label">Destino</label>
                        <input
                            type="text"
                            className="rota-input-field"
                            placeholder="Para onde vamos?"
                            value={destino}
                            onChange={(e) => {
                                setDestino(e.target.value);
                                buscarSugestoes(e.target.value, "destino");
                            }}
                        />
                        {sugestoesDestino.length > 0 && (
                            <div className="rota-suggestions-list">
                                {sugestoesDestino.map((sugestao, index) => (
                                    <div
                                        key={index}
                                        className="rota-suggestion-item"
                                        onClick={() => selecionarSugestao(sugestao, "destino")}
                                    >
                                        {sugestao.place_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Modo de Transporte */}
                    <div className="rota-input-group">
                        <label className="rota-input-label">Modo</label>
                        <div
                            className="rota-mode-select"
                            value={modo}
                            onChange={() => setModo(e.target.value)}
                        >
                            <div className={"rota-mode-select-item" + (modo === "driving" ? " active" : "")} onClick={() => setModo("driving")}><FaCar /> </div>
                            <div className={"rota-mode-select-item" + (modo === "cycling" ? " active" : "")} onClick={() => setModo("cycling")}><MdDirectionsBike /></div>
                            <div className={"rota-mode-select-item" + (modo === "walking" ? " active" : "")} onClick={() => setModo("walking")}><FaPersonWalking /></div>
                        </div>
                        <button className="rota-search-button" onClick={buscarRota}>
                            Buscar Rota
                        </button>
                    </div>


                    <div className="button-rota" onClick={() => setRotaExpandida(!rotaExpandida)}>

                        {rotaExpandida ? <IoChevronUp /> : <IoChevronDown />}
                    </div>
                </div>

                {/* Card de Instruções */}
                {mostrarInstrucoes && (
                    <div className={`rota-card rota-directions-card ${expandido ? "rota-card-expandido" : ""}`}>

                        <button className="button-directions" onClick={() => setExpandido(!expandido)}> {expandido ? <IoChevronDown /> : <IoChevronUp />}</button>
                        <div className="rota-card-header">
                            <div>
                                <h3 className="rota-card-title">Instruções</h3>
                                {routeInfo && (
                                    <div className="rota-route-info">
                                        {formatDuration(routeInfo.duration)} • {formatDistance(routeInfo.distance)}
                                    </div>
                                )}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                {instrucoes.length} passos
                            </span>
                        </div>




                        <div className="next-step"  >
                            {instrucoes.length > 0 && (
                                <div className={`rota-instruction-item ${checkedSteps[currentInstructionIndex !== -1 ? currentInstructionIndex : instrucoes.length - 1] ? 'completed' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="rota-instruction-checkbox"
                                        checked={!!checkedSteps[currentInstructionIndex !== -1 ? currentInstructionIndex : instrucoes.length - 1]}
                                        onChange={() => toggleStep(currentInstructionIndex !== -1 ? currentInstructionIndex : instrucoes.length - 1)}
                                    />
                                    <div className="rota-instruction-text">
                                        <div>{currentInstructionIndex !== -1 ? instrucoes[currentInstructionIndex].instrucao : instrucoes[instrucoes.length - 1].instrucao}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`rota-instructions-list ${expandido ? 'expandido' : ''}`}>
                            {expandido && instrucoes.map((instrucao, index) => (
                                <div
                                    key={index}
                                    className={`rota-instruction-item ${checkedSteps[index] ? 'completed' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="rota-instruction-checkbox"
                                        checked={!!checkedSteps[index]}
                                        onChange={() => toggleStep(index)}
                                    />
                                    <div className="rota-instruction-text">
                                        <div>{instrucao.instrucao}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {allStepsChecked && (
                            <div className="rota-destination-reached">
                                🎉 Você chegou ao seu destino!
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Rota;