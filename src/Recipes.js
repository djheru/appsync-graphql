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
