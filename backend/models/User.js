class Library {

    constructor() {
        this.books = [];
    }

    // Add Book
    addBook() {
        let id = Number(prompt("Enter Book ID"));
        let name = prompt("Enter Book Name");
        let author = prompt("Enter Author Name");
        let quantity = Number(prompt("Enter Quantity"));

        let book = new Book(id, name, author, quantity);

        this.books.push(book);

        console.log("Book Added Successfully");
    }

    // Search Book
    searchBook() {

        if (this.books.length === 0) {
            console.log("No Books Available");
            return;
        }

        let id = Number(prompt("Enter Book ID To Search"));
        let found = false;

        for (let i = 0; i < this.books.length; i++) {

            if (this.books[i].id === id) {

                console.log("Book Found");
                console.log("Book ID:", this.books[i].id);
                console.log("Book Name:", this.books[i].name);
                console.log("Author:", this.books[i].author);
                console.log("Quantity:", this.books[i].quantity);

                found = true;
                break;
            }
        }

        if (found === false) {
            console.log("Book Not Found");
        }
    }

    // Display Books
    displayBooks() {

        if (this.books.length === 0) {
            console.log("No Books Available");
            return;
        }

        console.log("======= BOOK LIST =======");

        for (let i = 0; i < this.books.length; i++) {

            console.log("Book ID:", this.books[i].id);
            console.log("Book Name:", this.books[i].name);
            console.log("Author:", this.books[i].author);
            console.log("Quantity:", this.books[i].quantity);
            console.log("----------------------");
        }
    }

    // Update Book
    updateBook() {

        let id = Number(prompt("Enter Book ID To Update"));
        let found = false;

        for (let i = 0; i < this.books.length; i++) {

            if (this.books[i].id === id) {

                this.books[i].name = prompt("Enter New Book Name");
                this.books[i].author = prompt("Enter New Author Name");
                this.books[i].quantity = Number(prompt("Enter New Quantity"));

                console.log("Book Updated Successfully");

                found = true;
                break;
            }
        }

        if (found === false) {
            console.log("Book Not Found");
        }
    }

    // Delete Book
    deleteBook() {

        let id = Number(prompt("Enter Book ID To Delete"));
        let found = false;

        for (let i = 0; i < this.books.length; i++) {

            if (this.books[i].id === id) {

                this.books.splice(i, 1);

                console.log("Book Deleted Successfully");

                found = true;
                break;
            }
        }

        if (found === false) {
            console.log("Book Not Found");
        }
    }

    // Total Books
    countBooks() {
        console.log("Total Books:", this.books.length);
    }
}
let library = new Library();

let choice;

do {

    choice = Number(prompt(`
======= LIBRARY MANAGEMENT SYSTEM =======

1. Add Book
2. Search Book
3. Display All Books
4. Update Book
5. Delete Book
6. Count Total Books
7. Exit

Enter Your Choice:
`));

    switch (choice) {

        case 1:
            library.addBook();
            break;

        case 2:
            library.searchBook();
            break;

        case 3:
            library.displayBooks();
            break;

        case 4:
            library.updateBook();
            break;

        case 5:
            library.deleteBook();
            break;

        case 6:
            library.countBooks();
            break;

        case 7:
            console.log("Program Ended");
            break;

        default:
            console.log("Invalid Choice");
    }

} while (choice !== 7);