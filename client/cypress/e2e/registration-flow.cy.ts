describe('Registration and login flow', () => {
  const appUrl = 'http://localhost:5173';
  const uniqueEmail = `qa-${Date.now()}@example.com`;

  it('allows a new user to register, sign in, and reach the expected dashboard', () => {
    cy.visit(appUrl);

    cy.contains('button', 'Create account').click();
    cy.url().should('include', '/register');

    cy.get('#name').type('QA Tester');
    cy.get('#email').type(uniqueEmail);
    cy.get('#password').type('StrongP@ss1');
    cy.get('#role').select('listener');

    cy.contains('button', 'Create account').click();
    cy.url().should('include', '/login');

    cy.get('#email').type(uniqueEmail);
    cy.get('#password').type('StrongP@ss1');
    cy.contains('button', 'Sign in').click();

    cy.url({ timeout: 10000 }).should('include', '/listener');
    cy.contains('Live Sessions').should('be.visible');
  });
});
