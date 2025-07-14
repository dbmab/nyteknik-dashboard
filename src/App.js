import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// --- Helper & Data Processing Functions ---

// Normalizes a string by making it lowercase, trimming whitespace,
// removing content in parentheses, and removing a trailing 's'.
const normalizeInterest = (text) => {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/\s*\(.*\)\s*/g, '').trim().replace(/s$/, '');
};

// Keywords for categorization
const categories = {
    'Elfordon & Batteri': ['elbil', 'ev', 'tesla', 'volvo xc', 'bmw x3', 'polestar', 'lynk & co', 'audi', 'skoda', 'renault', 'hyundai', 'huawei', 'xiaomi', 'byd', 'xpeng', 'geely', 'ford', 'mercedes', 'batteri', 'northvolt', 'laddning', 'v2g', 'solid-state'],
    'AI & Datorvetenskap': ['ai', 'artificial intelligence', 'deepmind', 'chatgpt', 'grok', 'copilot', 'robot', 'automation', 'data', 'cybersecurity', 'it security', 'wifi', 'dator', 'program', 'mjukvara', 'software', 'cloud', 'moln', 'semiconductor', 'quantum computing'],
    'Energi & Miljö': ['energi', 'kärnkraft', 'vindkraft', 'solkraft', 'fusion', 'smr', 'reaktor', 'elnät', 'grid', 'elpris', 'koldioxid', 'co2', 'miljö', 'klimat', 'återvinning', 'avfall', 'hållbarhet'],
    'Försvar & Rymd': ['försvar', 'militär', 'saab', 'gripen', 'ubåt', 'flygplan', 'drönare', 'vapen', 'rymd', 'space exploration', 'mars', 'nasa', 'esa'],
    'Ekonomi & Industri': ['ekonomi', 'industri', 'startup', 'innovation', 'tillverkning', 'produktion', 'skf', 'volvo', 'ericsson', 'handel', 'tullar', 'marknad'],
    'Övrigt': ['spel', 'puzzle', 'hälsa', 'medicin', 'forskning', 'utbildning', 'transport']
};

// --- UI Components ---

const Card = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">{title}</h2>
        {children}
    </div>
);

const Loader = () => <div className="loader"></div>;

// --- Main App Component ---

export default function App() {
    const [allLines, setAllLines] = useState([]);
    const [sortedInterests, setSortedInterests] = useState([]);
    const [activeView, setActiveView] = useState('overview');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target.result;
            processAndDisplayData(contents);
            setIsLoading(false);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const processAndDisplayData = useCallback((rawData) => {
        const lines = rawData.split('\n')
            .map(line => line.split(',').map(normalizeInterest).filter(item => item.length > 2))
            .filter(line => line.length > 0);
        setAllLines(lines);

        const interestCounts = lines.flat().reduce((acc, interest) => {
            acc[interest] = (acc[interest] || 0) + 1;
            return acc;
        }, {});

        const sorted = Object.entries(interestCounts).sort(([, a], [, b]) => b - a);
        setSortedInterests(sorted);
    }, []);

    const renderView = () => {
        switch (activeView) {
            case 'categories':
                return <CategoriesView sortedInterests={sortedInterests} />;
            case 'connections':
                return <ConnectionsView allLines={allLines} />;
            case 'ai-analysis':
                return <AIAnalysisView sortedInterests={sortedInterests} />;
            case 'overview':
            default:
                return <OverviewView sortedInterests={sortedInterests} setActiveView={setActiveView} />;
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6">
            <header className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Interaktiv Intressedashboard med AI</h1>
                <p className="text-md md:text-lg text-slate-600 mt-2">Utforska läsarintressen från Ny Teknik.</p>
            </header>

            {sortedInterests.length === 0 ? (
                <Card title="1. Ladda upp din datafil" className="max-w-2xl mx-auto text-center">
                    <p className="text-slate-500 mb-4">Välj en .txt-fil där varje rad representerar en persons intressen, separerade med kommatecken.</p>
                    <input type="file" id="fileInput" accept=".txt" onChange={handleFileSelect} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {isLoading && <p className="mt-4 text-blue-600">Bearbetar filen...</p>}
                </Card>
            ) : (
                <>
                    <nav id="view-navigation" className="flex justify-center flex-wrap gap-2 mb-8 bg-white p-2 rounded-lg shadow-md sticky top-2 z-10">
                        {['overview', 'categories', 'connections', 'ai-analysis'].map(view => (
                            <button
                                key={view}
                                onClick={() => setActiveView(view)}
                                className={`nav-button px-4 py-2 rounded-md font-semibold text-gray-700 hover:bg-blue-100 ${activeView === view ? 'active' : ''}`}
                            >
                                {view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')}
                            </button>
                        ))}
                    </nav>
                    {renderView()}
                </>
            )}
        </div>
    );
}

// --- View Components ---

const OverviewView = ({ sortedInterests, setActiveView }) => {
    const [filter, setFilter] = useState('');
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const filteredData = sortedInterests.filter(([interest]) => interest.toLowerCase().includes(filter.toLowerCase()));

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: filteredData.map(item => item[0]),
                datasets: [{
                    label: 'Antal omnämnanden',
                    data: filteredData.map(item => item[1]),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });
        return () => chartInstance.current.destroy();
    }, [filteredData]);

    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card title="Topp 10 Intressen" className="lg:col-span-1">
                    <ol className="list-decimal list-inside space-y-2">
                        {sortedInterests.slice(0, 10).map(([interest, count]) => (
                            <li key={interest} className="text-gray-600">
                                {interest.charAt(0).toUpperCase() + interest.slice(1)} ({count})
                            </li>
                        ))}
                    </ol>
                </Card>
                <Card title="Intressediagram" className="lg:col-span-2">
                    <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Sök för att filtrera diagrammet..." className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="chart-container">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </Card>
            </div>
            <Card title="Ordmoln" id="word-cloud-container">
                <div className="flex flex-wrap justify-center items-center gap-2 p-4">
                    {sortedInterests.slice(0, 50).map(([text, count]) => {
                        const maxCount = sortedInterests[0][1];
                        const fontSize = 12 + (count / maxCount) * 48;
                        return (
                            <span
                                key={text}
                                className="inline-block cursor-pointer"
                                style={{
                                    fontSize: `${Math.max(12, fontSize)}px`,
                                    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                                    margin: '4px',
                                    padding: '2px 5px'
                                }}
                                onClick={() => {
                                    // A bit of a hack to communicate between sibling components without a full state manager
                                    const connectionInput = document.getElementById('connectionInput');
                                    if (connectionInput) {
                                      connectionInput.value = text;
                                    }
                                    setActiveView('connections');
                                }}
                            >
                                {text}
                            </span>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

const CategoriesView = ({ sortedInterests }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    
    const { categoryCounts, categoryTerms } = React.useMemo(() => {
        const counts = {};
        const terms = {};
        Object.keys(categories).forEach(cat => {
            counts[cat] = 0;
            terms[cat] = {};
        });

        sortedInterests.forEach(([interest, count]) => {
            let assigned = false;
            for (const category in categories) {
                if (categories[category].some(keyword => interest.includes(keyword))) {
                    counts[category] += count;
                    terms[category][interest] = (terms[category][interest] || 0) + count;
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                counts['Övrigt'] += count;
                terms['Övrigt'][interest] = (terms['Övrigt'][interest] || 0) + count;
            }
        });
        return { categoryCounts: counts, categoryTerms: terms };
    }, [sortedInterests]);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Fördelning av Intressen' }
                }
            }
        });
        return () => chartInstance.current.destroy();
    }, [categoryCounts]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Intressen per Kategori">
                <div className="chart-container" style={{ height: '50vh' }}>
                    <canvas ref={chartRef}></canvas>
                </div>
            </Card>
            <Card title="Toppämnen inom Kategorier">
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                    {Object.keys(categoryTerms).map(category => (
                        <div key={category} className="p-4 border-b">
                            <h3 className="font-bold text-lg">{category}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(categoryTerms[category])
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 5)
                                    .map(([term, count]) => (
                                        <span key={term} className="bg-gray-200 text-gray-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                                            {term} ({count})
                                        </span>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

const ConnectionsView = ({ allLines }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [connections, setConnections] = useState(null);

    const findConnections = useCallback(() => {
        const normalizedSearch = normalizeInterest(searchTerm);
        if (!normalizedSearch) {
            setConnections(null);
            return;
        }

        const linesWithTerm = allLines.filter(line => line.includes(normalizedSearch));
        if (linesWithTerm.length === 0) {
            setConnections({ error: `Hittade inga läsare med intresset "${searchTerm}".` });
            return;
        }

        const relatedCounts = {};
        linesWithTerm.forEach(line => {
            line.forEach(interest => {
                if (interest !== normalizedSearch) {
                    relatedCounts[interest] = (relatedCounts[interest] || 0) + 1;
                }
            });
        });

        const sorted = Object.entries(relatedCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([interest, count]) => ({
                interest,
                percentage: ((count / linesWithTerm.length) * 100).toFixed(1)
            }));

        if (sorted.length === 0) {
            setConnections({ error: `Inga andra intressen hittades tillsammans med "${searchTerm}".` });
            return;
        }
        
        setConnections({ title: `Personer intresserade av <span class="text-blue-600">${searchTerm}</span> är också intresserade av:`, list: sorted });

    }, [searchTerm, allLines]);

    // This effect allows the word cloud to trigger a search
    useEffect(() => {
        const input = document.getElementById('connectionInput');
        if (input && input.value) {
            setSearchTerm(input.value);
            findConnections();
        }
    }, [findConnections]);

    return (
        <Card title="Hitta kopplingar mellan ämnen">
            <p className="text-gray-600 mb-4">Skriv in ett ämne för att se vilka andra ämnen som oftast nämns tillsammans med det.</p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                    type="text"
                    id="connectionInput"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ex: AI, elbil, kärnkraft..."
                    className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={findConnections} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Sök kopplingar
                </button>
            </div>
            <div className="mt-6 min-h-[150px]">
                {!connections && <p className="text-gray-500">Börja med att skriva ett ämne i sökfältet ovan.</p>}
                {connections?.error && <p className="text-red-500">{connections.error}</p>}
                {connections?.list && (
                    <>
                        <h3 className="text-lg font-semibold mb-3" dangerouslySetInnerHTML={{ __html: connections.title }}></h3>
                        <ul className="list-disc list-inside space-y-2">
                            {connections.list.map(item => (
                                <li key={item.interest} className="text-gray-700">
                                    {item.interest.charAt(0).toUpperCase() + item.interest.slice(1)} <span className="text-sm text-gray-500">({item.percentage}% av fallen)</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </Card>
    );
};


const AIAnalysisView = ({ sortedInterests }) => {
    const [personaResult, setPersonaResult] = useState('');
    const [explanationResult, setExplanationResult] = useState('');
    const [isPersonaLoading, setPersonaLoading] = useState(false);
    const [isExplanationLoading, setExplanationLoading] = useState(false);
    const explainInputRef = useRef(null);

    const callGeminiAPI = async (prompt) => {
        const apiKey = ""; // Handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            if (!response.ok) throw new Error(`API-fel: ${response.statusText}`);
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            return "Ett fel uppstod vid kommunikation med AI-tjänsten. Försök igen senare.";
        }
    };

    const generatePersona = async () => {
        setPersonaLoading(true);
        const topInterestsText = sortedInterests.slice(0, 30).map(item => item[0]).join(', ');
        const prompt = `Baserat på följande lista av toppintressen från läsarna av en svensk tekniktidning, skapa en detaljerad och insiktsfull persona-beskrivning av den typiska läsaren. Beskriv deras sannolika yrkesroll, intressen utanför tekniken, och vilka typer av artiklar de skulle uppskatta mest. Svara på svenska. Intressen: ${topInterestsText}`;
        const result = await callGeminiAPI(prompt);
        setPersonaResult(result.replace(/\n/g, '<br>'));
        setPersonaLoading(false);
    };

    const explainTerm = async () => {
        const term = explainInputRef.current.value;
        if (!term.trim()) {
            setExplanationResult('<p class="text-red-500">Vänligen ange ett begrepp att förklara.</p>');
            return;
        }
        setExplanationLoading(true);
        const prompt = `Förklara begreppet "${term}" på ett enkelt och koncist sätt på svenska. Målgruppen är en teknikintresserad läsare som inte nödvändigtvis är expert inom just detta område. Använd gärna en analogi om det passar.`;
        const result = await callGeminiAPI(prompt);
        setExplanationResult(result.replace(/\n/g, '<br>'));
        setExplanationLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Skapa Läsare-Persona ✨">
                <p className="text-gray-600 mb-4">Generera en profil av den typiska läsaren baserat på de mest populära intressena i din data.</p>
                <button onClick={generatePersona} disabled={isPersonaLoading} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPersonaLoading ? 'Genererar...' : 'Generera Läsaranalys'}
                </button>
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[150px]">
                    {isPersonaLoading ? <Loader /> : (personaResult ? <p dangerouslySetInnerHTML={{ __html: personaResult }}></p> : <p className="text-gray-500">Resultatet från AI-analysen kommer att visas här...</p>)}
                </div>
            </Card>
            <Card title="Förklara ett Begrepp ✨">
                <p className="text-gray-600 mb-4">Få en enkel förklaring av ett tekniskt ämne.</p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <input type="text" ref={explainInputRef} placeholder="T.ex. 'kvantdator' eller 'SMR'" className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={explainTerm} disabled={isExplanationLoading} className="bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isExplanationLoading ? 'Förklarar...' : 'Förklara'}
                    </button>
                </div>
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[150px]">
                    {isExplanationLoading ? <Loader /> : (explanationResult ? <p dangerouslySetInnerHTML={{ __html: explanationResult }}></p> : <p className="text-gray-500">Förklaringen kommer att visas här...</p>)}
                </div>
            </Card>
        </div>
    );
};
