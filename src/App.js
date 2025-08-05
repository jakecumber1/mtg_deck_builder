import React, {useState} from 'react';
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
  //finally definte our deck array
  const [deck, setDeck] = useState([]);

  //First we will handle querying, we will use the axios library to use scryfall and store the results
  //Remember, an async function is one that returns a promise, I.E it runs while other stuff occurs
  //This means we want to use it for tasks that can take a long time without interupting our app...
  //Like querying for mtg cards!
  const searchCards = async () => {
    console.log(`${encodeURIComponent(searchQuery)}`);
    //await pauses the function exectution till the promise is returned, we don't want to return the results before we've got them.
    const rest = await axios.get(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchResults(rest.data.data);
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

  //Now that our basic deck building functions are handled we can create the actual page
  //Remember that the webpage is wrapped in a return statement in the app function.
  return (
    <div className="App">
      <h1>MTG Deck Builder</h1>
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search for cards:"
      ></input>
      <button onClick={searchCards}>Search</button>

      <h2>Search Results</h2>
      <div className="card-list">
        {searchResults.map(card => (
          <div key={card.id} className="card">
            <img src={card.image_uris?.small || ''} alt={card.name} />
            <p>{card.name}</p>
            <button onClick={() => addToDeck(card)}>Add to Deck</button>
          </div>
        ))}
      </div>

      <h2>Deck ({deck.length} cards)</h2>
      <div className="card-list">
        {deck.map((card, index) => (
          <div key={index} className="card">
            <img src={card.image_uris?.small || ''} alt={card.name} />
            <p>{card.name}</p>
            <button onClick={() => removeFromDeck(index)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
