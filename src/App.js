import React, {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './App.css';

//The goal is to create an web app which let's us query for mtg cards and add them to a deck list!
//This is my first decently serious react app, so expect a bunch of comments over explaining every section
function App() {
  //define 3 react components, one for querying, one for the returned query resutls, and one to hold our deck
  //remember for react we define components as an array with the first element being the name 
  //and the second being the setting function
  //useState with '' indicates we are creating a string component
  const [searchQuery, setSearchQuery] = useState('');
  //useState with [] indicates we are creating an array component
  const [searchResults, setSearchResults] = useState([]);
  //finally define our deck array
  const [deck, setDeck] = useState([]);
  //Today (day 2), I'll be implementing a import/export deck feature in the standard mtg deck list format.
  //number_of_cards card_name (set_abbreviation) set_card_number
  //First we need a state for our import text
  const [importText, setImportText] = useState('');



  //First we will handle querying, we will use the axios library to use scryfall and store the results
  //Remember, an async function is one that returns a promise, I.E it runs while other stuff occurs
  //This means we want to use it for tasks that can take a long time without interupting our app...
  //Like querying for mtg cards!
  const searchCards = async () => {
    console.log(`${encodeURIComponent(searchQuery)}`);
    //await pauses the function exectution till the promise is returned, we don't want to return the results before we've got them.
    //wrap in a try clause in case we search for a non-existant card.
    try {
      const rest = await axios.get(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(rest.data.data);
    } catch (err) {
      alert(`Failed to return any results for ${searchQuery}`)
    }

  };

  //Next we will handle simple deck operations, adding and removing
  //Function addToDeck adds a card to a deck
  const addToDeck = (card) => {
    //[...x] is a spread operator, it just means let's take an array x and put it's components into this array
    //so [...x, y] means [x[0],...x[n], y] 
    setDeck([...deck, card]);   
  };

  const removeFromDeck = (index) => {
    //create a variable which holds our deck info.
    const newDeck = [...deck];
    //splice is (index, number of items to remove, optionally item's to replace)
    newDeck.splice(index, 1);
    setDeck(newDeck);
  };

  //DAY 2: facilitating the importing and exporting of decks, the following are those functions.
  const exportDeck = () => {
    const counts = {};
    
    //iterate through the deck, counting cards for the export format
    deck.forEach(card => {
      //remember fstrings in javascript need to use backticks and not standard quotes
      const key = `${card.name} (${card.set.toUpperCase()}) ${card.collector_number}`;
      //the count of this key is equal to the current count + 1, using 0 if the key is not already in the list.
      counts[key] = (counts[key] || 0) + 1;
    });
    //Here is where we assemble the format of our export
    //using the counts map we created we take the keys as the card info and the values as the count and flip them in resulting in our desired format.
    const exportText = Object.entries(counts).map(([cardInfo, count]) => `${count} ${cardInfo}`).join('\n');

    //Now export to a txt file for easy copy and pasting.
    //Blob is just a file like object (means Binary Large Object), it represents raw binary data, allowing us to manipulate it into our txt file output.
    const blob = new Blob([exportText], { type: 'text/plain'});
    const url = URL.createObjectURL(blob);

    //create a link to download our file in the document called 'a', attach our url and download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'decklist.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  //Now for the importing of deck
  //remember, since we're querying scryfall, we want this to be async for whatever latency we encounter
  const importDeck = async () => {
    const lines = importText.trim().split('\n');
    const importedDeck = [];
    
    for (const line of lines) {
      //some horrifying regex for your enjoyment
      //In case you are untrained in regex:
      /*
      //Wrapping the regex in () for example: (\d+) is what will get extracted to match's array. This is called a capture group.
      /^ and $/ represent the start and end of the regex statement
      \s* means 0 or more occurances of spacing, incase someone has a line like "                       Lightning bolt"
      (\d+) means any combination of number chars (for quantity of card)
      \s+ means any amount of spacing
      (.+) means any amount of any chars (for name of card, we don't use \w to account for spacing)
      (\w+) means any amount of letter characters (for set names), also \( \) are for the opening and closing parantheses of a set (FNV) for instance
      finally, (\d+) for the set card number.
      */
      const match = line.match(/^\s*(\d+)\s+(.+)\s+\((\w+)\)\s+(\d+)$/);
      //if we don't have a match, alert that the line is invalid
      if (!match) {
        //LATER: create an alert feed to not pester the user with popups
       alert(`Invalid Line: ${line}`);
       continue; 
      }
      
      //if this code is running, we have a valid match
      //starting with the ',' inside an array using array destructuring/unpacking means to skip that item, specifically the first item
      //The first element was the entire matched string, so we're skipping that element for space.
      const [, count, name, setCode, collectorNumber] = match;

      //wrapping this in a try statement, in case the card entered doesn't actually exist
      try {
        const res = await axios.get(`https://api.scryfall.com/cards/${setCode.toLowerCase()}/${collectorNumber}`);
        //add our card data for the number of duplicates we have
        for (let i = 0; i < parseInt(count); i++) {
          importedDeck.push(res.data);
        }
      //if at any point we hit an error, it's likely because the card couldn't be found or loaded
      } catch (err) {
        alert(`Failed to load/find card: ${name} (${setCode}) ${collectorNumber}`)
      }
    }
    setDeck(importedDeck);
  }; 


  //Day 2 BONUS! Handle the card faces of double sided/split images
  //Going to add a function to bundle hadnle getting the card faces data.
  const getCardImages = (card) => {
    //check if card has a faces property, if it does, ensure it is an array object
    if (card.card_faces && Array.isArray(card.card_faces) && card.card_faces.every(face => face.image_uris)) {
      //then return a mapping of faces to images for later
      return card.card_faces.map(face => face.image_uris?.normal);
    }
    //otherwise return a normal card
    return [card.image_uris?.normal];
  }
  //add card image display to condense the html down in the bottom, handle split cards
  //the ({ card }) indifcates that this is a function component
  //this means it's a javascript function which returns jsx
  const CardImageDisplay = ({card}) => {
    //Get our card faces
    const images = getCardImages(card);
    //return the corresponding html code
    return (
      <div className="card-images">
        {images.map((url, idx) => (
          <HoverImagePreview
            key={idx}
            src={url}
            alt={`${card.name} face ${idx}`}
            className={
              card.layout === "split" ? "split-card" :
              card.layout?.includes("transform") || card.layout?.includes("modal_dfc") ? "double-faced-card" : ""
            }
          ></HoverImagePreview>
        ))}
      </div>
    )
  }

//Day 4: Write a function HoverImagePreview, which will allow us to preview cards like in MTG arena so they're readable on large displays
//ensure it can be added to CardImageDisplay to keep from messing with the existing html at the bottom
  const HoverImagePreview = ({src, alt}) => {
    //this kind of usestate is for a dictionary/hash map
    const [previewPos, setPreviewPos] = useState({x: 0, y: 0});
    const [showPreview, setShowPreview] = useState(false);

    const previewWidth = 300;
    const previewHeight = 420;

    const handleMouseMove = (e) => {
      let x = e.clientX + 15;
      let y = e.clientY + 15;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + previewWidth > viewportWidth) {
        x = e.clientX - previewWidth - 15;
      }
      if (y + previewHeight > viewportHeight) {
        y = e.clientY - previewHeight - 15
      }
      setPreviewPos({x, y});
    };

    

    return (
      <>
        <img
          src={src}
          alt={alt}
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
          onMouseMove={handleMouseMove}
          style={{cursor : "pointer"}}
        />
        {showPreview && createPortal(
          <div
            className= "card-preview"
            style={{top: previewPos.y, left: previewPos.x, position: 'fixed'}}
          >
            <img src={src} alt={alt} />
          </div>,
          document.body
        )}
      </>
    )
  }

  //write a function for generating stars in the background of our website
  //stars are stylized in app.cs, this just generates and puts them into the html
  //we're going to do structured randomness, to ensure the stars are spread-out intentionally but not looking placed individually.
  const generateStars = (numRows = 8, numCols = 12) => {
    const starContainer = document.getElementById("star-container");
    //ensure the container is empty before we populate it, if it isn't empty don't run the function
    if (starContainer && starContainer.children.length > 0) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const cellWidth = screenWidth / numCols;
    const cellHeight = screenHeight / numRows;

    //iterate through our rows and columns, populating the stars at fixed points but within a random distance of that point
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const star = document.createElement("div");
        star.classList.add("star");

        //in our grid, pick a random position within the current cell
        const x = col * cellWidth + Math.random() * cellWidth;
        const y = row * cellHeight + Math.random() * cellHeight;

        //randomize the size of the star
        //guarentees us a size between 3-7 pixels
        const size = Math.random() * 4 + 3;
        star.style.left = `${x}px`;
        star.style.top = `${y}px`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        //randomize the timing of the animation, so stars shine differently from eachother
        star.style.animationDelay = `${Math.random() * 5}s`;

        starContainer.appendChild(star);
      }
    }
  };

  const StarContainer = () => {
    useEffect(() => {
      const starContainer = document.createElement("div");
      starContainer.className = "star-container";
      starContainer.id = "star-container";
      document.body.appendChild(starContainer);
      //generate stars
      generateStars();
      //clean up
      return () => {};
    }, [])
    return null;
  };
  
  //Day 4 (bonus), add a feature for saving and loading a decks
  //variable for typing in a name field for the deck
  const [deckName, setDeckName] = React.useState("");
  const [savedDeckNames, setSavedDeckNames] = React.useState([]);
  // Load saved names when the page loads
  React.useEffect(() => {
    const names = Object.keys(localStorage).filter(key =>
      key.startsWith("deck-")
    ).map(key => key.replace("deck-", ""));
    setSavedDeckNames(names);
  }, []);

  const saveDeck = () => {
    if (!deckName) return;
    localStorage.setItem(`deck-${deckName}`, JSON.stringify(deck));

    setSavedDeckNames(prev => {
      if (!prev.includes(deckName)) {
        return [...prev, deckName];
      }
      return prev;
    });
  };

  const loadDeck = (name) => {
    const stored = localStorage.getItem(`deck-${name}`);
    if (stored) {
      setDeck(JSON.parse(stored));
    }
  };
  /*
  const DeckSaveLoad = () => {
    return (
      <div>
        <input
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="Deck name"
        >
        </input>
        <button onClick={saveDeck}>Save</button>
        
        <select
        onChange={(e) => loadDeck(e.target.value)}
        defaultValue="">
          <option value="" disabled>
            Select a saved deck
          </option>
          {savedDeckNames.map((name) => (
            <option key={name} value= {name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    )
  }
  */
  //Now that our basic deck building functions are handled we can create the actual page
  //Remember that the webpage is wrapped in a return statement in the app function.
  //The current layout starting day 2 is just one section after the other, here is what I want my final layout to be
  /*
  Page Header
  Current deck list and card count
  (Later i might want deck stat's here if i can get those with scryfall, stuff like mana spread and color spread, maybe even some visualizations with d3)
  import and export button right below, import brings up a text entry on top of the existing page, instead of being on the page itself
  Search Query bar for manual searching
  Returned query results, critically, I want it in it's own box with a scroll bar instead of extending the page for the length of the query returns
  */
  return (
    <div className="App">
      <StarContainer></StarContainer>
      <h1 className="glow">MTG Deck Builder</h1>
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search for cards"
      ></input>
      <button onClick={searchCards}>Search</button>

      <h2 className="glow">Search Results</h2>
        <div className="card-list">
          {searchResults.map((card, index) => (
            <div key={index} className="card">
              <CardImageDisplay card={card} />
              <p>{card.name}</p>
              <button onClick={() => addToDeck(card)}>Add</button>
            </div>
          ))}
        </div>
      <h2 className="glow">Deck ({deck.length} cards)</h2>
      <div className="card-list">
        {deck.map((card, index) => (
          <div key={index} className="card">
            <CardImageDisplay card={card} />
            <p>{card.name}</p>
            <button onClick={() => removeFromDeck(index)}>Remove</button>
          </div>
        ))}
      </div>
      <div>
        <textarea
          rows="10"
          cols="50"
          placeholder="Paste thy deck list here"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}>
        </textarea>
        <br />
        <button onClick={importDeck}>Import Deck</button>
        <button onClick={exportDeck}>Export Deck</button>
      </div>
      <DeckSaveLoad
      deckName={deckName}
      setDeckName={setDeckName}
      saveDeck={saveDeck}
      savedDeckNames={savedDeckNames}
      loadDeck={loadDeck}></DeckSaveLoad>
    </div>
  );
}

//Day 5: moved the deck save and load feature to outside the app function to save lag, it was rerendering every frame.
function DeckSaveLoad({ deckName, setDeckName, saveDeck, savedDeckNames, loadDeck }) {
  return (
    <div>
      <input
        value={deckName}
        onChange={(e) => setDeckName(e.target.value)}
        placeholder="Deck name"
      />
      <button onClick={saveDeck}>Save</button>

      <select
        onChange={(e) => loadDeck(e.target.value)}
        value=""
        className="deck-select"
      >
        <option value="" disabled>
          Select a saved deck
        </option>
        {savedDeckNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}



export default App;
