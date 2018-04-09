# Serverless GraphQL React Applications with AWS AppSync

## Create the AWS AppSync API

- Navigate to AppSync dashboard in the AWS console
- Select the "Create API" option
- Give the API a name, e.g. "Recipes"
- Select "Custom Schema" and proceed
    - Displays the API URL and API key
    - Displays a "Getting Started" section
    - Displays a nav on right side
        - Schema
        - Queries
        - Data Sources
        - Settings

## Create the Schema

- Click "Schema" to create our schema
- In the "Schema" section, clear out existing contents and replace with
    the following

```
type Recipe {
    id: ID!
    name: String!
    ingredients: [String]
    instructions: [String]
}

type Query {
    fetchRecipe(id: ID!):Recipe
}
```

- In the "Data Types" section, see the buttons to attach resolvers to
    the fields
- Click "Save"

## Creating Resources

- Click "Create Resources" in the top right
- Select "Recipe" as the type
- Note the generated table definition
- Click "Create" and note the new items in the schema

## Testing the API

- Select "Queries" in the left nav
- Create the following mutation to add a recipe

```
mutation createRecipe {
  createRecipe(input: {
    id: "123456"
    name: "Spicy Tuna Roll"
    instructions: [
        "Chop tuna",
        "Make spicy sauce",
        "Mix spicy sauce with tuna"
    ]
    ingredients: [
        "Tuna",
        "Mayonnaise",
        "Srirachi",
        "Soy sauce",
        "lime",
        "salt",
        "pepper"
    ]
  }) {
    id
  }
}
```
- Note the return data containing the "id"
- Create the following query to list the recipes

```
import gql from 'graphql-tag'

export default gql`
  query listRecipes {
    listRecipes  {
      items {
        name
        id
        ingredients
        instructions
      }
    }
  }
`
```

- Note that pressing the Play button now displays a dropdown to allow
    you to choose the query to execute
- Execute the `listRecipes` query and note the results


## Resolvers

- Return to the Schema section in the nav
- Scroll to the createRecipe mutation and click the RecipeTable resolver
- Resolvers have 3 parts
    - Data source name
    - Request mapping template
    - Response mapping template
- Mapping templates are written in a templating language called Apache
    Velocity Templating Language or VTL.
- Used to translate GraphQL requests into requests to the data source
    - https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference.html

```
{
  "version": "2017-02-28",
  "operation": "PutItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id),
  },
  "attributeValues": $util.dynamodb.toMapValuesJson($ctx.args.input),
  "condition": {
    "expression": "attribute_not_exists(#id)",
    "expressionNames": {
      "#id": "id",
    },
  },
}
```

- `$ctx` refers to the contextual information for the resolver
    - https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html#utility-helpers-in-util
- Structure as follows

```
{
   "arguments" : { ... },
   "source" : { ... },
   "result" : { ... },
   "identity" : { ... }
}
```

- `arguments` - A map containing all GraphQL arguments for this field
- `identity` - An object containing information about the caller
- `source` - A map containing the resolution of the parent field
- `result` - A map containing the results of this resolver - this is
    only available to the response mapping template
- The `$util` variable used in the template contains helper methods
    - https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html#utility-helpers-in-util
    - e.g. `$util.autoId()` to generate ids

## React App

### Create the app and install deps

- Use create-react-app

```
create-react-app recipes && \
    cd recipes && \
    npm i --save uuid react-router-dom glamor react-apollo aws-appsync \
    aws-appsync-react graphql-tag
```

- Download the AppSync configuration file
    - Go to the API in the AppSync Dashboard
    - At the bottom, under "Integrate your GraphQL API", select "Web"
    - Download to `./src/appsync.js`

- Set up the routes and boilerplate
    - `touch src/Nav.js src/Recipes.js src/AddRecipe.js`
    - `mkdir src/mutations src/queries src/subscriptions`

## Wiring up the AppSync Client

```
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import AWSAppSyncClient from "aws-appsync";
import { Rehydrated } from 'aws-appsync-react';
import { ApolloProvider } from 'react-apollo';

import appSyncConfig from './appsync';

// Instantiate the AppSync client
const client = new AWSAppSyncClient({
  url: appSyncConfig.graphqlEndpoint,
  region: appSyncConfig.region,
  auth: {
    type: appSyncConfig.authenticationType,
    apiKey: appSyncConfig.apiKey,
  }
});

// Inject the client into our ApolloProvider
const WithProvider = () => (
  <ApolloProvider client={client}>
    <Rehydrated>
      <App />
    </Rehydrated>
  </ApolloProvider>
);

ReactDOM.render(<WithProvider />, document.getElementById('root'));
```

## Setting Up the Router

- define two routes as seen below in App.js

```
import React, { Component } from 'react';
import './App.css';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'

import Recipes from './Recipes'
import AddRecipe from './AddRecipe'
import Nav from './Nav'

class App extends Component {
  render() {
    return (
      <div className="App">
        <Router>
          <div>
            <Nav/>
            <Switch>
              <Route exact path="/" component={ Recipes }/>
              <Route path="/addrecipe" component={ AddRecipe }/>
            </Switch>
          </div>
        </Router>
      </div>
    );
  }
}

export default App;
```

- Set up the `Nav` component

```
import React from 'react'
import { Link } from 'react-router-dom'
import { css } from 'glamor'

export default class Nav extends React.Component {
  render() {
    return (
      <div {...css(styles.container)}>
        <h1 {...css(styles.heading)}>Recipe App</h1>
        <Link to='/' {...css(styles.link)}>Recipes</Link>
        <Link to='/addrecipe' {...css(styles.link)}>Add Recipe</Link>
      </div>
    )
  }
}

const styles = {
  link: {
    textDecoration: 'none',
    marginLeft: 15,
    color: 'white',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  container: {
    display: 'flex',
    backgroundColor: '#00c334',
    padding: '0px 30px',
    alignItems: 'center'
  },
  heading: {
    color: 'white',
    paddingRight: 20
  }
}
```

## Set Up Create Recipe Mutation

```
// In ./src/mutations/CreateRecipe.js
import gql from 'graphql-tag'

export default gql`
  mutation createRecipe(
      $id: ID!,
      $name: String!,
      $ingredients: [String!],
      $instructions: [String!]
    ) {
    createRecipe(input: {
      id: $id, name: $name, ingredients: $ingredients, instructions: $instructions,
    }) {
      id
      name
      instructions
      ingredients
    }
  }
`
```

## Set up List Recipes Query

```
// in .src/queries/ListRecipes.js
import gql from 'graphql-tag'

export default gql`
  query listRecipes {
    listRecipes  {
      items {
        name
        id
        ingredients
        instructions
      }
    }
  }
`
```

## Wire Up the AddRecipe Component

```
import { graphql } from 'react-apollo';
import { css } from 'glamor';
import uuidV4 from 'uuid/v4';

import CreateRecipe from './mutations/CreateRecipe';
import ListRecipes from './queries/ListRecipes';

class AddRecipe extends React.Component { /* class omitted for now */ }

export default graphql(CreateRecipe, {
  props: props => ({
    onAdd: recipe => props.mutate({
      variables: recipe,
      optimisticResponse: {
        __typename: 'Mutation',
        createRecipe: { ...recipe,  __typename: 'Recipe' }
      },
      update: (proxy, { data: { createRecipe } }) => {
        const data = proxy.readQuery({ query: ListRecipes });
        data.listRecipes.items.push(createRecipe);
        proxy.writeQuery({ query: ListRecipes, data });
      }
    })
  })
})(AddRecipe)
```

## Create AddRecipe Component

```
state = {
    name: '',
    ingredient: '',
    ingredients: [],
    instruction: '',
    instructions: []
  };

  onChange = (key, value) => {
    this.setState({ [key]: value });
  };

  addInstruction = () => {
    if (this.state.instruction === '') return;
    const instructions = this.state.instructions;
    instructions.push(this.state.instruction);
    this.setState({
      instructions,
      instruction: ''
    });
  };

  addIngredient = () => {
    if (this.state.ingredient === '') return;
    const ingredients = this.state.ingredients;
    ingredients.push(this.state.ingredient);
    this.setState({
      ingredients,
      ingredient: ''
    });
  };

  addRecipe = () => {
    const { name, ingredients, instructions } = this.state;
    this.props.onAdd({
      id: uuidV4(),
      ingredients,
      instructions,
      name
    });
    this.setState({
      name: '',
      ingredient: '',
      ingredients: [],
      instruction: '',
      instructions: []
    });
  };

  render() {
    return (
      <div { ...css(styles.container) }>
        <h2>Create Recipe</h2>
        <input
          value={ this.state.name }
          onChange={ evt => this.onChange('name', evt.target.value) }
          placeholder='Recipe name'
          { ...css(styles.input) }
        />
        <div>
          <p>Recipe Ingredients:</p>
          {
            this.state.ingredients.map((ingredient, i) => <p key={ i }>{ ingredient }</p>)
          }
        </div>
        <input
          value={ this.state.ingredient }
          onChange={ evt => this.onChange('ingredient', evt.target.value) }
          placeholder='Ingredient'
          { ...css(styles.input) }
        />
        <button onClick={ this.addIngredient } { ...css(styles.button) }>Add Ingredient</button>

        <div>
          <p>Recipe Instructions:</p>
          {
            this.state.instructions.map((instruction, i) => <p key={ i }>{ `${i + 1}. ${instruction}` }</p>)
          }
        </div>
        <input
          value={ this.state.instruction }
          onChange={ evt => this.onChange('instruction', evt.target.value) }
          placeholder='Instruction'
          { ...css(styles.input) }
        />
        <button onClick={ this.addInstruction } { ...css(styles.button) }>Add Instruction</button>

        <div { ...css(styles.submitButton) } onClick={ this.addRecipe }>
          <p>Add Recipe</p>
        </div>
      </div>
    );
  }
```

#### Add styles for `AddRecipe`

```
const styles = {
  button: {
    border: 'none',
    background: 'rgba(0, 0, 0, .1)',
    width: 250,
    height: 50,
    cursor: 'pointer',
    margin: '15px 0px'
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 100,
    paddingRight: 100,
    textAlign: 'left'
  },
  input: {
    outline: 'none',
    border: 'none',
    borderBottom: '2px solid #00dd3b',
    height: '44px',
    fontSize: '18px',
  },
  textarea: {
    border: '1px solid #ddd',
    outline: 'none',
    fontSize: '18px'
  },
  submitButton: {
    backgroundColor: '#00dd3b',
    padding: '8px 30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: .85,
    cursor: 'pointer',
    ':hover': {
      opacity: 1
    }
  }
};
```

## Add Subscription for New Recipes

```
// ./src/subscriptions/NewRecipeSubscription

import gql from 'graphql-tag'

export default gql`
  subscription NewRecipeSub {
    onCreateRecipe {
      name
      id
      ingredients
      instructions
    }
  }
`
```

## Wiring up the Recipes Boilerplate

```
import React from 'react';
import { graphql } from 'react-apollo';
import { css } from 'glamor'
import ListRecipes from './queries/ListRecipes';
import NewRecipeSubscription from './subscriptions/NewRecipeSubscription';

class Recipes extends React.Component {
  componentWillMount() {
    this.props.subscribeToNewRecipes();
  }

  renderRecipe = (recipe, i) => (
    <div {...css(styles.recipe)} key={i}>
      <p {...css(styles.title)}>Recipe name: {recipe.name}</p>
      <div>
        <p {...css(styles.title)}> Ingredients</p>
        <div>
          {
            recipe
              .ingredients
              .map((ingredient, i2) => (<p key={i2} {...css(styles.subtitle)}>{ ingredient }</p>))
          }
        </div>
        <p {...css(styles.title)}> Instructions</p>
        <div>
          {
            recipe
              .instructions
              .map((instruction, i3) => (<p key={ i3 } { ...css(styles.subtitle) }>{ instruction }</p>))
          }
        </div>
      </div>
    </div>
  );

  render() {
    return (
      <div {...css(styles.container)}>
        <h1>Recipes</h1>
        {
          this.props.recipes.map(this.renderRecipe)
        }
      </div>
    );
  }
}

const styles = {
  title: {
    fontSize: 16
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, .5)'
  },
  recipe: {
    boxShadow: '2px 2px 5px rgba(0, 0, 0, .2)',
    marginBottom: 7,
    padding: 14,
    border: '1px solid #ededed'
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 100,
    paddingRight: 100,
    textAlign: 'left'
  }
};

export default graphql(ListRecipes, {
  options: {
    fetchPolicy: 'cache-and-network'
  },
  props: props => ({
    recipes: props.data.listRecipes ? props.data.listRecipes.items : [],
    subscribeToNewRecipes: params => {
      props.data.subscribeToMore({
        document: NewRecipeSubscription,
        updateQuery: (prev, { subscriptionData: { data: { onCreateRecipe } } }) => {
          return {
            ...prev,
            listRecipes: {
              __typename: 'RecipeConnection',
              items: [ onCreateRecipe, ...prev.listRecipes.items.filter(recipe => recipe.id !== onCreateRecipe.id) ]
            }
          }
        }
      })
    }
  })
})(Recipes);
```
