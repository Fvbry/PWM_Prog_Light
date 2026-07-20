/* ==========================================
   1. FUNZIONI DATABASE (Lettura e scrittura JSON)
   ========================================== */

function leggiUtenti() {
    let dati = localStorage.getItem("utenti");
    if (dati == null) {
        return []; 
    } else {
        return JSON.parse(dati);
    }
}

function salvaUtenti(arrayUtenti) {
    localStorage.setItem("utenti", JSON.stringify(arrayUtenti));
}

function setUtenteAttivo(username) {
    localStorage.setItem("utente_active", username);
}

function getUtenteAttivo() {
    return localStorage.getItem("utente_active");
}

function getDatiUtenteAttivo() {
    let username = getUtenteAttivo();
    let utenti = leggiUtenti();
    for (let i = 0; i < utenti.length; i++) {
        if (utenti[i].username === username) {
            return utenti[i];
        }
    }
    return null;
}

function aggiornaUtente(utenteAggiornato) {
    let utenti = leggiUtenti();
    for (let i = 0; i < utenti.length; i++) {
        if (utenti[i].username === utenteAggiornato.username) {
            utenti[i] = utenteAggiornato;
        }
    }
    salvaUtenti(utenti);
}

function esci() {
    localStorage.removeItem("utente_active");
    window.location.href = "index.html";
}


/* ==========================================
   2. LOGICA DELLE PAGINE (Gestione del DOM)
   ========================================== */
document.addEventListener("DOMContentLoaded", async function() {

    let path = window.location.pathname;
    if (getUtenteAttivo() == null && !path.includes("index.html")) {
        window.location.href = "index.html";
        return;
    }

    let btnEsci = document.getElementById("btn-esci");
    if (btnEsci) {
        btnEsci.addEventListener("click", esci);
    }

    // --- PAGINA INDEX (LOGIN E REGISTRAZIONE) ---
    if (path.includes("index.html")) {
        if (getUtenteAttivo() != null) {
            window.location.href = "home.html";
        }

        // Registrazione con verifica doppie password ed email
        document.getElementById("form-reg").addEventListener("submit", function(event) {
            event.preventDefault(); 
            
            let user = document.getElementById("reg-user").value;
            let email = document.getElementById("reg-email").value;
            let pass = document.getElementById("reg-pass").value;
            let pass2 = document.getElementById("reg-pass2").value;
            
            if (pass !== pass2) {
                alert("Errore: Le password non coincidono!");
                return;
            }

            let utenti = leggiUtenti();
            
            for (let i = 0; i < utenti.length; i++) {
                if (utenti[i].username === user) {
                    alert("Questo Nome utente è già in uso!");
                    return;
                }
                if (utenti[i].email === email) {
                    alert("Questa Email è già registrata!");
                    return;
                }
            }

            let nuovoUtente = {
                username: user,
                email: email,
                password: pass,
                ricettario: [] // Salverà solo gli ID come stringhe
            };

            utenti.push(nuovoUtente);
            salvaUtenti(utenti);
            alert("Registrazione completata! Ora fai il login.");
            document.getElementById("form-reg").reset();
        });

        // Login
        document.getElementById("form-login").addEventListener("submit", function(event) {
            event.preventDefault();
            
            let user = document.getElementById("log-user").value;
            let pass = document.getElementById("log-pass").value;
            let utenti = leggiUtenti();
            
            let trovato = false;
            for (let i = 0; i < utenti.length; i++) {
                if (utenti[i].username === user && utenti[i].password === pass) {
                    trovato = true;
                    setUtenteAttivo(user);
                    window.location.href = "home.html";

                    return; // EDIT: Ferma il ciclo
                }
            }

            if (trovato === false) {
                alert("Nome utente o password errati.");
            }
        });
    }

    // --- PAGINA HOME (RICERCA RICETTE) ---
    if (path.includes("home.html")) {
        document.getElementById("form-cerca").addEventListener("submit", function(event) {
            event.preventDefault();
            
            let titolo = document.getElementById("input-ricerca").value;
            let griglia = document.getElementById("griglia-ricette");
            
            griglia.innerHTML = "<p>Sto cercando...</p>";

            fetch("https://www.themealdb.com/api/json/v1/1/search.php?s=" + titolo)
                .then(res => res.json())
                .then(dati => {
                    griglia.innerHTML = ""; 
                    
                    if (dati.meals == null) {
                        griglia.innerHTML = "<p>Nessuna ricetta trovata.</p>";
                        return;
                    }

                    let utente = getDatiUtenteAttivo(); // Serve per controllare cosa hai già salvato

                    for (let i = 0; i < dati.meals.length; i++) {
                        let ricetta = dati.meals[i];
                        
                        // Controllo se l'ID è già nel vettore ricettario
                        let giaSalvata = utente.ricettario.includes(ricetta.idMeal);
                        
                        // Creo dinamicamente il bottone corretto
                        let bottoneHTML = "";
                        if (giaSalvata) {
                            bottoneHTML = `<button class="btn-rosso" onclick="rimuoviRicetta('${ricetta.idMeal}', this)">Rimuovi</button>`;
                        } else {
                            bottoneHTML = `<button onclick="salvaRicetta('${ricetta.idMeal}', this)">Salva</button>`;
                        }

                        let cardHTML = `
                            <div class="card-ricetta">
                                <img src="${ricetta.strMealThumb}" alt="Foto piatto">
                                <h3>${ricetta.strMeal}</h3>
                                ${bottoneHTML}
                            </div>
                        `;
                        griglia.innerHTML += cardHTML;
                    }
                })
                .catch(() => { griglia.innerHTML = "<p>Errore di connessione.</p>"; });
        });
    }

    // --- PAGINA RICETTARIO (CARICAMENTO TRAMITE ID) ---
    if (path.includes("ricettario.html")) {
        let utente = getDatiUtenteAttivo();
        let griglia = document.getElementById("griglia-ricettario");
        
        if (utente.ricettario.length === 0) {
            griglia.innerHTML = "<p>Non hai ancora salvato nulla.</p>";
        } else {
            griglia.innerHTML = "<p>Caricamento ricette salvate...</p>";
            // Errore dead code
            let idRaccolti = "";
            
            // Ciclo per scaricare i dettagli di ciascun ID salvato nell'utente
            for (let i = 0; i < utente.ricettario.length; i++) {
                let idRicetta = utente.ricettario[i];
                
                try {
                    let risposta = await fetch("https://www.themealdb.com/api/json/v1/1/lookup.php?i=" + idRicetta);
                    let dati = await risposta.json();
                    
                    if (i === 0) griglia.innerHTML = ""; // Rimuovo la scritta "Caricamento" al primo elemento valido
                    
                    if (dati.meals != null) {
                        let ricetta = dati.meals[0];
                        let cardHTML = `
                            <div class="card-ricetta">
                                <img src="${ricetta.strMealThumb}" alt="Foto piatto">
                                <h3>${ricetta.strMeal}</h3>
                                <button class="btn-rosso" onclick="rimuoviRicetta('${ricetta.idMeal}', this)">Rimuovi</button>
                            </div>
                        `;
                        griglia.innerHTML += cardHTML;
                    }
                } catch (e) {
                    console.error("Impossibile recuperare i dettagli per l'ID: " + idRicetta);
                }
            }
        }
    }

    // --- PAGINA PROFILO (MODIFICA PROFILO CON CONFERMA PASSWORD) ---
    if (path.includes("profilo.html")) {
        let utente = getDatiUtenteAttivo();
        document.getElementById("mod-user").value = utente.username;
        document.getElementById("mod-email").value = utente.email;

        document.getElementById("form-profilo").addEventListener("submit", function(event) {
            event.preventDefault();
            
            let nuovaEmail = document.getElementById("mod-email").value;
            let nuovaPass = document.getElementById("mod-pass").value;
            let nuovaPass2 = document.getElementById("mod-pass2").value;

            if (nuovaPass !== nuovaPass2) {
                alert("Errore: Le nuove password non coincidono!");
                return;
            }

            utente.email = nuovaEmail;
            utente.password = nuovaPass;
            
            aggiornaUtente(utente);
            alert("Profilo aggiornato con successo!");
            
            document.getElementById("mod-pass").value = "";
            document.getElementById("mod-pass2").value = "";
        });

        document.getElementById("btn-elimina").addEventListener("click", function() {
            if (confirm("Vuoi davvero cancellare il tuo profilo per sempre?")) {
                let utenti = leggiUtenti();
                let utentiRimasti = [];
                
                for (let i = 0; i < utenti.length; i++) {
                    if (utenti[i].username !== utente.username) {
                        utentiRimasti.push(utenti[i]);
                    }
                }
                
                salvaUtenti(utentiRimasti);
                esci();
            }
        });
    }
});

/* ==========================================
   3. FUNZIONI INTERATTIVE DEI BOTTONI
   ========================================== */

// Riceve l'ID e l'elemento HTML del bottone cliccato (btn)
function salvaRicetta(id, btn) {
    let utente = getDatiUtenteAttivo();
    
    // Aggiungo al DB
    if (!utente.ricettario.includes(id)) {
        utente.ricettario.push(id);
        aggiornaUtente(utente);
    }

    // MANIPOLAZIONE DOM: Trasformo il bottone "Salva" in "Rimuovi"
    btn.innerText = "Rimuovi";
    btn.className = "btn-rosso";
    // Cambio l'azione del click: ora se lo clicchi di nuovo avvia la rimozione!
    btn.setAttribute("onclick", `rimuoviRicetta('${id}', this)`);
}

// Riceve l'ID e l'elemento HTML del bottone cliccato (btn)
function rimuoviRicetta(idDaRimuovere, btn) {
    let utente = getDatiUtenteAttivo();
    let nuovoRicettario = [];
    
    for (let i = 0; i < utente.ricettario.length; i++) {
        if (utente.ricettario[i] !== idDaRimuovere) {
            nuovoRicettario.push(utente.ricettario[i]);
        }
    }
    utente.ricettario = nuovoRicettario;
    aggiornaUtente(utente);
    
    // MANIPOLAZIONE DOM (Dipende da dove ci troviamo)
    let path = window.location.pathname;
    
    if (path.includes("ricettario.html")) {
        // Se siamo nel ricettario, cancelliamo l'intera card HTML dallo schermo
        // btn.parentElement seleziona il <div class="card-ricetta"> e lo elimina
        btn.parentElement.remove();
        
        // Se abbiamo rimosso l'ultima ricetta, stampiamo il messaggio di avviso
        if (utente.ricettario.length === 0) {
            document.getElementById("griglia-ricettario").innerHTML = "<p>Non hai ancora salvato nulla.</p>";
        }
    } else {
        // Se siamo nella Home, ritrasformiamo semplicemente il bottone in "Salva"
        btn.innerText = "Salva";
        btn.className = "";
        btn.setAttribute("onclick", `salvaRicetta('${idDaRimuovere}', this)`);
    }
}