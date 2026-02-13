"""
AI Concept Simplifier — "Explain This Like I'm 10"

Takes a paragraph or concept and returns:
1. A simplified explanation a child could understand
2. A real-world analogy / example

Uses a curated knowledge base of academic concepts with kid-friendly
explanations, plus a general-purpose text simplification fallback.
"""
import re
import logging
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


# ─── Concept Knowledge Base ─────────────────────────────
# Each entry: keyword(s) → (simple explanation, analogy)

CONCEPT_DB: dict[tuple[str, ...], dict] = {
    # ── Database / DBMS ──────────────────────────────────
    ('normalization',): {
        'simple': "Normalization means organizing your data so nothing is repeated unnecessarily. You split big messy tables into smaller, cleaner ones where each piece of information lives in exactly one place.",
        'analogy': "It's like organizing your wardrobe so each type of clothing has its own drawer — socks in one, shirts in another — instead of throwing everything into one big pile.",
        'emoji': '🗄️',
    },
    ('denormalization',): {
        'simple': "Denormalization means intentionally putting some repeated data back into your tables to make reading data faster, even though it takes more space.",
        'analogy': "It's like keeping a copy of your favorite recipe on the fridge AND in your recipe book — slightly wasteful, but way faster when you're hungry.",
        'emoji': '📋',
    },
    ('primary key',): {
        'simple': "A primary key is a unique label that identifies each row in a table. No two rows can have the same primary key.",
        'analogy': "Think of it like your roll number in class — every student has a different one, so the teacher can find exactly who they're looking for.",
        'emoji': '🔑',
    },
    ('foreign key',): {
        'simple': "A foreign key is a column in one table that points to the primary key of another table, creating a link between them.",
        'analogy': "It's like writing your friend's phone number in your contacts — the number belongs to them, but you keep a reference so you can find them.",
        'emoji': '🔗',
    },
    ('sql', 'structured query language'): {
        'simple': "SQL is a special language you use to talk to databases — to ask questions, add data, change data, or delete data.",
        'analogy': "It's like a waiter at a restaurant: you tell them what you want (your query), and they go to the kitchen (database) and bring back exactly what you asked for.",
        'emoji': '💬',
    },
    ('join', 'inner join', 'outer join'): {
        'simple': "A JOIN combines rows from two or more tables based on something they have in common, like matching IDs.",
        'analogy': "Imagine you have a list of students and a list of their grades on separate papers. A JOIN is like placing them side by side and matching each student with their grade.",
        'emoji': '🤝',
    },
    ('indexing', 'database index', 'index'): {
        'simple': "An index is like a shortcut that helps the database find data much faster without scanning every single row.",
        'analogy': "Think of the index at the back of a textbook — instead of reading every page to find 'photosynthesis', you look it up in the index and jump straight to page 42.",
        'emoji': '📑',
    },
    ('acid', 'acid properties'): {
        'simple': "ACID stands for Atomicity, Consistency, Isolation, and Durability. These are four promises a database makes to keep your data safe and correct, even if something goes wrong.",
        'analogy': "It's like a piggy bank that promises: your money either fully goes in or doesn't (Atomic), the total is always correct (Consistent), two people can't mess with it at the same time (Isolated), and once money is in, it stays even if the lights go out (Durable).",
        'emoji': '🛡️',
    },
    ('transaction',): {
        'simple': "A transaction is a group of database operations that must all succeed together — if any one fails, everything is rolled back like it never happened.",
        'analogy': "It's like transferring money between bank accounts: the money must leave one account AND arrive in the other. If either step fails, nothing happens at all.",
        'emoji': '💸',
    },
    ('er diagram', 'entity relationship', 'erd'): {
        'simple': "An ER diagram is a visual map showing the things (entities) in your system, their properties, and how they relate to each other.",
        'analogy': "It's like a family tree — each person is an entity, their name and age are attributes, and the lines show who is related to whom.",
        'emoji': '🗺️',
    },
    ('schema',): {
        'simple': "A schema is the blueprint of your database — it defines what tables exist, what columns each table has, and what type of data goes in each column.",
        'analogy': "Think of it like the floor plan of a house: it shows how many rooms there are and what each room is for, before any furniture is moved in.",
        'emoji': '📐',
    },

    # ── Operating Systems ────────────────────────────────
    ('deadlock',): {
        'simple': "A deadlock happens when two or more processes are stuck waiting for each other to finish, so none of them can move forward.",
        'analogy': "Imagine two people in a narrow hallway facing each other — neither will step aside, so both are stuck forever.",
        'emoji': '🔒',
    },
    ('process', 'process vs thread'): {
        'simple': "A process is a running program with its own memory space. A thread is a lighter task running inside a process, sharing the same memory.",
        'analogy': "A process is like a whole kitchen cooking a meal. Threads are the individual cooks inside that kitchen — they share the same pots and ingredients but each work on a different task.",
        'emoji': '👨‍🍳',
    },
    ('virtual memory',): {
        'simple': "Virtual memory tricks programs into thinking they have more RAM than actually exists by using part of the hard disk as extra memory.",
        'analogy': "It's like a desk that's too small — you keep some papers in a drawer and swap them onto the desk only when you need them.",
        'emoji': '🪄',
    },
    ('paging',): {
        'simple': "Paging divides memory into small fixed-size chunks called pages so the OS can manage memory more efficiently.",
        'analogy': "It's like a bookshelf with equal-sized slots — each book (page) fits into any slot, and the librarian keeps a list of which book is where.",
        'emoji': '📄',
    },
    ('semaphore',): {
        'simple': "A semaphore is a signaling tool that controls how many processes can access a shared resource at the same time.",
        'analogy': "Think of a bathroom with a sign that says 'Occupied' or 'Vacant' — the semaphore is that sign, making sure only one person goes in at a time.",
        'emoji': '🚦',
    },
    ('mutex', 'mutual exclusion'): {
        'simple': "A mutex is a lock that ensures only one thread or process can use a resource at any time. Others must wait until the lock is released.",
        'analogy': "It's like a talking stick in a meeting — only the person holding the stick can speak, everyone else has to wait their turn.",
        'emoji': '🔐',
    },
    ('scheduling', 'cpu scheduling', 'process scheduling'): {
        'simple': "CPU scheduling decides which process gets to use the processor and for how long, so all programs get a fair chance to run.",
        'analogy': "It's like a teacher deciding which student gets to use the single computer in class — they take turns based on rules like 'shortest task first' or 'round robin'.",
        'emoji': '📅',
    },
    ('context switching',): {
        'simple': "Context switching is when the CPU saves the state of one process and loads another, so it can switch between running programs.",
        'analogy': "It's like a chef pausing one recipe (saving where they stopped), working on another dish for a while, then coming back to the first recipe exactly where they left off.",
        'emoji': '🔄',
    },
    ('kernel',): {
        'simple': "The kernel is the core part of an operating system that manages hardware, memory, and processes. Everything goes through it.",
        'analogy': "Think of it as the brain of your computer — it controls everything behind the scenes so apps can run without worrying about the hardware.",
        'emoji': '🧠',
    },
    ('file system',): {
        'simple': "A file system is how the OS organizes and stores files on a disk — it keeps track of where every file is and how to find it.",
        'analogy': "It's like a library's catalog system — without it, books (files) would just be in random piles and you'd never find anything.",
        'emoji': '📂',
    },

    # ── Data Structures & Algorithms ─────────────────────
    ('recursion',): {
        'simple': "Recursion is when a function calls itself to solve a smaller version of the same problem, until it reaches a simple base case.",
        'analogy': "Imagine you're in a line and ask the person in front 'What's my position?' They ask the person in front of them, and so on, until the first person says '1!' Then each answer bubbles back.",
        'emoji': '🪞',
    },
    ('stack',): {
        'simple': "A stack is a data structure where the last item you put in is the first one you take out — Last In, First Out.",
        'analogy': "Think of a stack of plates: you always take the top plate first, and put new plates on top.",
        'emoji': '🥞',
    },
    ('queue',): {
        'simple': "A queue is a data structure where the first item you put in is the first one you take out — First In, First Out.",
        'analogy': "It's exactly like a line at a movie theater — the first person in line gets their ticket first.",
        'emoji': '🎟️',
    },
    ('linked list',): {
        'simple': "A linked list is a chain of items where each item points to the next one, like a treasure hunt where each clue leads to the next.",
        'analogy': "Imagine a scavenger hunt: each clue tells you where the next clue is. You can't jump to clue #5 directly — you have to follow the chain from the start.",
        'emoji': '⛓️',
    },
    ('binary tree', 'tree',): {
        'simple': "A binary tree is a structure where each item (node) can have at most two children — a left and a right. It branches out like an upside-down tree.",
        'analogy': "Think of a family tree where every person has at most two children. To find someone, you keep going left or right until you reach them.",
        'emoji': '🌳',
    },
    ('hash table', 'hash map', 'hashing'): {
        'simple': "A hash table stores data using a special formula (hash function) that converts keys into positions, making lookups super fast.",
        'analogy': "It's like a coat check at a fancy party — you hand in your coat, get a numbered ticket, and later use that exact ticket number to get your coat back instantly.",
        'emoji': '#️⃣',
    },
    ('big o notation', 'time complexity', 'big o'): {
        'simple': "Big O notation describes how fast an algorithm runs as the input gets bigger. It tells you the worst-case scenario.",
        'analogy': "If finding a name in a phone book by flipping every page is O(n), using the alphabetical order to jump to the right section is O(log n) — way faster!",
        'emoji': '⏱️',
    },
    ('sorting', 'bubble sort', 'merge sort', 'quick sort'): {
        'simple': "Sorting means arranging items in order. Different algorithms do this in different ways — some are slow but simple, others are fast but complex.",
        'analogy': "Bubble sort is like repeatedly comparing neighbors and swapping them — slow like organizing cards one swap at a time. Merge sort is like splitting the deck in half, sorting each half, then merging — much faster!",
        'emoji': '🔢',
    },
    ('graph', 'graph theory'): {
        'simple': "A graph is a set of dots (nodes) connected by lines (edges). It's used to model relationships and networks.",
        'analogy': "Think of a social network: each person is a dot, and a friendship between two people is a line connecting them.",
        'emoji': '🕸️',
    },
    ('dynamic programming', 'dp'): {
        'simple': "Dynamic programming solves complex problems by breaking them into smaller overlapping sub-problems and storing the answers so you don't repeat work.",
        'analogy': "It's like doing homework and writing down answers to common sub-problems on sticky notes — next time you see the same sub-problem, you just look at the sticky note instead of re-solving it.",
        'emoji': '📝',
    },

    # ── Networking ───────────────────────────────────────
    ('tcp', 'tcp/ip', 'transmission control protocol'): {
        'simple': "TCP is a set of rules for sending data reliably over the internet. It makes sure every piece arrives in the right order, and re-sends anything that gets lost.",
        'analogy': "It's like sending a jigsaw puzzle by mail — each piece is numbered, the receiver checks they got all pieces, and asks you to re-send any missing ones.",
        'emoji': '📦',
    },
    ('udp', 'user datagram protocol'): {
        'simple': "UDP sends data quickly without checking if it all arrived. It's faster than TCP but less reliable.",
        'analogy': "It's like shouting a message across a noisy room — fast, but some words might get lost and nobody checks.",
        'emoji': '📢',
    },
    ('http', 'https', 'hypertext transfer protocol'): {
        'simple': "HTTP is the language your browser uses to ask websites for pages, and HTTPS is the secure version that encrypts everything.",
        'analogy': "HTTP is like sending a postcard — anyone can read it. HTTPS is like sending a sealed letter — only the receiver can open it.",
        'emoji': '🌐',
    },
    ('dns', 'domain name system'): {
        'simple': "DNS converts website names like 'google.com' into IP addresses that computers understand, like a phone book for the internet.",
        'analogy': "It's like a phone book: you look up a person's name (website) and find their phone number (IP address) so you can call them.",
        'emoji': '📖',
    },
    ('ip address',): {
        'simple': "An IP address is a unique number assigned to every device on a network, so data knows where to go.",
        'analogy': "It's like your home address — without it, the postman wouldn't know where to deliver your letters.",
        'emoji': '🏠',
    },
    ('firewall',): {
        'simple': "A firewall is a security system that monitors incoming and outgoing network traffic and blocks anything suspicious.",
        'analogy': "Think of a bouncer at a club — they check everyone at the door and only let in people who meet the rules.",
        'emoji': '🧱',
    },
    ('router',): {
        'simple': "A router directs data packets between different networks, finding the best path for each one.",
        'analogy': "It's like a traffic cop at an intersection — directing cars (data) to the right roads so they reach their destination.",
        'emoji': '🚦',
    },
    ('latency', 'ping'): {
        'simple': "Latency is the delay between sending a request and getting a response. Lower latency means faster communication.",
        'analogy': "It's like the time between shouting a question across a valley and hearing the echo come back.",
        'emoji': '⏳',
    },
    ('bandwidth',): {
        'simple': "Bandwidth is the maximum amount of data that can travel through a network connection in a given time.",
        'analogy': "Think of a water pipe: a wider pipe (more bandwidth) lets more water flow through at once.",
        'emoji': '🚿',
    },

    # ── OOP / Programming ────────────────────────────────
    ('encapsulation',): {
        'simple': "Encapsulation means bundling data and the methods that work on it together, and hiding the internal details from the outside.",
        'analogy': "It's like a TV remote — you press buttons (methods) to change the channel, but you don't need to know the electronics inside.",
        'emoji': '📦',
    },
    ('inheritance',): {
        'simple': "Inheritance lets a new class automatically get all the features of an existing class, plus add its own.",
        'analogy': "It's like inheriting traits from your parents — you get their eye color and height, but you also develop your own unique personality.",
        'emoji': '👨‍👧',
    },
    ('polymorphism',): {
        'simple': "Polymorphism means the same method name can behave differently depending on which object calls it.",
        'analogy': "Think of the word 'open' — you can open a door, open a book, or open an app. Same word, different actions depending on the object.",
        'emoji': '🎭',
    },
    ('abstraction',): {
        'simple': "Abstraction means showing only the important details and hiding the complex inner workings.",
        'analogy': "When you drive a car, you just use the steering wheel and pedals. You don't need to understand how the engine works — that complexity is abstracted away.",
        'emoji': '🚗',
    },
    ('class', 'class and object'): {
        'simple': "A class is a blueprint that defines what properties and actions something has. An object is an actual thing built from that blueprint.",
        'analogy': "A class is like a cookie cutter (the shape), and objects are the actual cookies you cut out — same shape, but each is a separate cookie.",
        'emoji': '🍪',
    },
    ('api', 'application programming interface'): {
        'simple': "An API is a set of rules that lets different programs talk to each other and share data.",
        'analogy': "It's like a waiter in a restaurant — you (the app) tell the waiter (API) what you want, and the waiter brings it from the kitchen (server).",
        'emoji': '🔌',
    },
    ('variable',): {
        'simple': "A variable is a named container that stores a value in your program. You can change what's inside it.",
        'analogy': "Think of a labeled jar — the label is the variable name, and whatever you put inside (a number, text, etc.) is the value.",
        'emoji': '🫙',
    },
    ('loop', 'for loop', 'while loop'): {
        'simple': "A loop repeats a block of code over and over until a condition is met.",
        'analogy': "It's like running laps around a track — you keep going around and around until you've completed the required number of laps.",
        'emoji': '🔁',
    },
    ('function', 'method'): {
        'simple': "A function is a reusable block of code that does a specific task. You give it inputs and it gives back an output.",
        'analogy': "Think of a vending machine — you put in coins (inputs), press a button (call the function), and get a snack (output). You can use it as many times as you want.",
        'emoji': '⚙️',
    },
    ('array', 'list'): {
        'simple': "An array is an ordered collection of items stored under one name, where each item has a number (index) starting from 0.",
        'analogy': "It's like a row of lockers numbered 0, 1, 2, 3... — each locker holds one item, and you find what you want by its locker number.",
        'emoji': '🗃️',
    },
    ('primitive data type', 'primitive data types', 'data type', 'data types'): {
        'simple': "Data types tell the computer what kind of value something is — like a whole number (int), a decimal (float), a letter or word (string), or true/false (boolean). Primitive types are the simplest, most basic building blocks.",
        'analogy': "Think of different shaped containers: a cup for liquids (numbers), a box for solid items (strings), and a switch for on/off (booleans). Each container only holds its specific type of thing.",
        'emoji': '🧱',
    },
    ('string',): {
        'simple': "A string is a sequence of characters — letters, numbers, or symbols — treated as text. Even '123' is a string if it's in quotes.",
        'analogy': "It's like a friendship bracelet made of letter beads — each bead is one character, and together they spell out a word or sentence.",
        'emoji': '🔤',
    },
    ('integer', 'int'): {
        'simple': "An integer is a whole number with no decimal point — like 1, 42, or -7. Computers use integers for counting and indexing.",
        'analogy': "Think of counting apples: you can have 1, 2, or 3 apples, but never 2.5 apples. That's an integer — always a whole number.",
        'emoji': '🔢',
    },
    ('float', 'floating point', 'double'): {
        'simple': "A float (floating-point number) is a number with a decimal point, like 3.14 or 0.5. It's used when you need more precision than whole numbers.",
        'analogy': "If integers are like counting whole pizza slices, floats let you say 'I ate 2.5 slices' — they handle the in-between values.",
        'emoji': '🔣',
    },
    ('pointer',): {
        'simple': "A pointer is a variable that stores the memory address of another variable — it 'points to' where the data lives in memory.",
        'analogy': "It's like a sticky note that says 'the cookies are in the top shelf, 3rd jar from the left' — it doesn't hold the cookies, just tells you where to find them.",
        'emoji': '👉',
    },
    ('object',): {
        'simple': "An object is a bundle of related data (properties) and actions (methods) that represents a thing in your program — like a car with color, speed, and a drive() action.",
        'analogy': "Think of a toy car: it has properties (red, small, 4 wheels) and actions (roll forward, turn left). An object packages all of that together.",
        'emoji': '📦',
    },
    ('interface',): {
        'simple': "An interface is a contract that says 'any class using me must have these specific methods' — it defines what something can do, without saying how.",
        'analogy': "It's like a job description: it lists what skills are required (methods), but each person (class) can bring those skills in their own way.",
        'emoji': '📜',
    },
    ('exception', 'exception handling', 'try catch'): {
        'simple': "An exception is an error that happens while your program is running. Exception handling lets you catch these errors gracefully instead of crashing.",
        'analogy': "It's like a safety net under a trapeze — if the acrobat (your code) falls (error), the net (try-catch) catches them instead of hitting the ground (crashing).",
        'emoji': '🥅',
    },
    ('constructor',): {
        'simple': "A constructor is a special method that runs automatically when you create a new object. It sets up the object's initial values.",
        'analogy': "It's like the setup crew before a concert — before the band can play (the object is used), someone has to set up the stage, microphones, and lights (initial values).",
        'emoji': '🏗️',
    },
    ('operator', 'operators'): {
        'simple': "Operators are symbols that tell the computer to perform specific actions — like + for addition, == for comparison, or && for 'and'.",
        'analogy': "They're like math symbols you already know from school: + means add, - means subtract. Programming just adds a few more like == (is equal?) and != (is not equal?).",
        'emoji': '➕',
    },
    ('character', 'char'): {
        'simple': "A character (char) is a single letter, digit, or symbol — like 'A', '7', or '!'. It's the smallest unit of text a computer stores.",
        'analogy': "Think of a single tile in Scrabble — it holds exactly one letter. A string is a whole word made of many tiles, but a char is just one tile.",
        'emoji': '🔡',
    },
    ('constant', 'const'): {
        'simple': "A constant is like a variable, but once you set its value, it can never change. It stays the same throughout the program.",
        'analogy': "It's like carving your name into a tree — once it's there, it's permanent. A variable is more like writing on a whiteboard that you can erase and rewrite.",
        'emoji': '🪨',
    },
    ('type casting', 'type conversion'): {
        'simple': "Type casting converts a value from one data type to another — like turning the string '42' into the integer 42.",
        'analogy': "It's like converting currency: you have dollars (string) and exchange them for euros (integer). The value is similar but the format changes.",
        'emoji': '🔄',
    },

    # ── Software Engineering ─────────────────────────────
    ('agile',): {
        'simple': "Agile is a way of building software in small, fast cycles called sprints, getting feedback early and adjusting as you go.",
        'analogy': "Instead of building an entire house and then asking if you like it, Agile builds one room at a time and checks with you after each room.",
        'emoji': '🏃',
    },
    ('waterfall model',): {
        'simple': "The Waterfall model builds software in strict sequential steps — requirements, design, coding, testing, deployment — with no going back.",
        'analogy': "It's like following a recipe exactly step by step — you can't go back and change the ingredients once you've started baking.",
        'emoji': '🌊',
    },
    ('version control', 'git'): {
        'simple': "Version control tracks every change to your code over time, so you can go back to any previous version if something breaks.",
        'analogy': "It's like the 'undo' history in a Google Doc — you can see every change anyone made and go back to any point in time.",
        'emoji': '📚',
    },
    ('debugging',): {
        'simple': "Debugging is the process of finding and fixing errors (bugs) in your code.",
        'analogy': "It's like being a detective: you look for clues (error messages), follow the trail, and figure out where things went wrong.",
        'emoji': '🔍',
    },
    ('compiler', 'interpreter'): {
        'simple': "A compiler translates your entire program into machine code before running it. An interpreter translates and runs it line by line.",
        'analogy': "A compiler is like translating an entire book before reading it. An interpreter is like having a translator who reads each sentence aloud as you go.",
        'emoji': '🔄',
    },

    # ── AI / Machine Learning ────────────────────────────
    ('machine learning', 'ml'): {
        'simple': "Machine learning is when computers learn patterns from data instead of being explicitly programmed with rules.",
        'analogy': "It's like teaching a dog tricks — you show it examples and reward correct behavior, and eventually it figures out the pattern on its own.",
        'emoji': '🤖',
    },
    ('neural network',): {
        'simple': "A neural network is a system inspired by the human brain, made of layers of connected nodes that learn to recognize patterns.",
        'analogy': "Imagine a chain of friends passing a message — each friend adds their own understanding before passing it on, and eventually the last friend gets a clear picture.",
        'emoji': '🧠',
    },
    ('overfitting',): {
        'simple': "Overfitting is when a model memorizes the training data too well, including its noise and mistakes, so it performs poorly on new data.",
        'analogy': "It's like a student who memorizes every answer in the textbook but can't solve a slightly different problem on the exam.",
        'emoji': '📖',
    },
    ('regression',): {
        'simple': "Regression is predicting a number (like a price or temperature) based on input data by finding the best-fitting line or curve.",
        'analogy': "It's like drawing the smoothest line through a scatter of dots on a graph — the line helps you predict where the next dot might fall.",
        'emoji': '📈',
    },
    ('classification',): {
        'simple': "Classification is sorting things into categories — like deciding if an email is spam or not spam based on its features.",
        'analogy': "It's like a mail sorter at the post office: they look at the address on each letter and put it in the right pile.",
        'emoji': '🏷️',
    },

    # ── Web Development ──────────────────────────────────
    ('rest', 'restful', 'rest api'): {
        'simple': "REST is a set of rules for building web services where you use simple HTTP methods (GET, POST, PUT, DELETE) to work with data.",
        'analogy': "Think of a library system: GET = borrow a book, POST = donate a new book, PUT = replace a book, DELETE = remove a book. Simple and consistent.",
        'emoji': '📡',
    },
    ('cookie', 'cookies'): {
        'simple': "A cookie is a small piece of data a website stores on your browser to remember things about you, like your login status.",
        'analogy': "It's like a stamp on your hand at an amusement park — it proves you've already paid, so you don't have to buy a ticket every time you re-enter.",
        'emoji': '🍪',
    },
    ('authentication', 'authorization'): {
        'simple': "Authentication verifies WHO you are (like logging in). Authorization decides WHAT you're allowed to do (like admin vs regular user).",
        'analogy': "Authentication is showing your ID at the airport. Authorization is your boarding pass — it decides which flight (resource) you can access.",
        'emoji': '🛂',
    },
    ('database',): {
        'simple': "A database is an organized collection of data stored electronically, designed so you can easily find, add, update, and delete information.",
        'analogy': "It's like a super-organized filing cabinet that can instantly find any document you ask for.",
        'emoji': '🗄️',
    },
    ('cache', 'caching'): {
        'simple': "Caching stores a copy of data that's frequently used so it can be retrieved much faster next time without redoing the work.",
        'analogy': "It's like keeping your most-used textbooks on your desk instead of walking to the library every time you need them.",
        'emoji': '⚡',
    },

    # ── Math / Theory ────────────────────────────────────
    ('algorithm',): {
        'simple': "An algorithm is a step-by-step set of instructions for solving a specific problem.",
        'analogy': "It's like a recipe: follow the steps in order, and you get the result you want every time.",
        'emoji': '📋',
    },
    ('boolean', 'boolean logic'): {
        'simple': "Boolean means something that can only be true or false — like a light switch that's either on or off.",
        'analogy': "Every yes/no question is boolean: 'Is it raining?' → True or False. Computers use this to make every single decision.",
        'emoji': '💡',
    },
    ('binary', 'binary number'): {
        'simple': "Binary is a number system that uses only two digits: 0 and 1. All computer data is stored in binary.",
        'analogy': "Imagine you can only communicate with light switches — ON (1) and OFF (0). By flipping enough switches in patterns, you can represent any number or letter.",
        'emoji': '🔢',
    },
    ('encryption', 'cryptography'): {
        'simple': "Encryption scrambles your data into a secret code so only someone with the right key can read it.",
        'analogy': "It's like writing a secret letter in a code only your best friend knows — anyone who intercepts it just sees gibberish.",
        'emoji': '🔐',
    },
    ('cloud computing', 'cloud'): {
        'simple': "Cloud computing means using someone else's powerful computers over the internet instead of your own, to store data or run programs.",
        'analogy': "It's like renting a storage unit instead of building a warehouse — you use what you need, and someone else handles the maintenance.",
        'emoji': '☁️',
    },
    ('pert', 'pert chart', 'program evaluation and review technique'): {
        'simple': "PERT is a project management tool that maps out all tasks in a project, their dependencies, and estimates how long the whole project will take.",
        'analogy': "It's like planning a road trip on a map — you plot every stop, figure out which stops depend on others, and estimate the total travel time including the critical path.",
        'emoji': '🗺️',
    },
    ('critical path', 'critical path method', 'cpm'): {
        'simple': "The critical path is the longest sequence of dependent tasks in a project — it determines the shortest possible project duration.",
        'analogy': "If you're cooking a big dinner, the dish that takes the longest to cook sets the minimum time before dinner is ready. That's your critical path.",
        'emoji': '⏰',
    },
    ('gantt chart',): {
        'simple': "A Gantt chart is a bar chart that shows tasks over time — each bar represents a task, its start date, and how long it takes.",
        'analogy': "It's like a school timetable that shows which subjects happen when and for how long, laid out as a colorful bar chart.",
        'emoji': '📊',
    },
    ('stakeholder',): {
        'simple': "A stakeholder is anyone who is affected by or has an interest in a project — like the client, users, developers, or managers.",
        'analogy': "If a school is being built, the stakeholders are the students, parents, teachers, and the town — anyone who cares about the result.",
        'emoji': '👥',
    },
    ('scope creep',): {
        'simple': "Scope creep is when a project slowly grows beyond its original plan because new features or changes keep being added.",
        'analogy': "It's like packing for a weekend trip and ending up with three suitcases because you keep thinking 'I might need this too!'",
        'emoji': '🧳',
    },
}


def _normalize(text: str) -> str:
    """Lowercase, strip, collapse whitespace."""
    return re.sub(r'\s+', ' ', text.strip().lower())


def _find_best_concept(text: str) -> dict | None:
    """
    Match input text against the concept database.
    Uses keyword matching + fuzzy similarity.
    """
    norm = _normalize(text)

    # 1. Exact keyword hit — prefer longer (more specific) keywords first
    matches: list[tuple[int, dict]] = []
    for keywords, entry in CONCEPT_DB.items():
        for kw in keywords:
            if kw in norm:
                matches.append((len(kw), entry))
    if matches:
        # Return the longest matching keyword (most specific)
        matches.sort(key=lambda x: x[0], reverse=True)
        return matches[0][1]

    # 2. Fuzzy match — compare full input against each keyword
    #    Require high threshold and prefer multi-word keyword matches.
    best_score = 0.0
    best_entry = None
    for keywords, entry in CONCEPT_DB.items():
        for kw in keywords:
            # Full input vs keyword
            score = SequenceMatcher(None, kw, norm).ratio()
            if score > best_score:
                best_score = score
                best_entry = entry

    # Require a high threshold to avoid wrong matches
    if best_score >= 0.75:
        return best_entry

    return None


def _simplify_with_ai(text: str, note_context: str = '') -> dict | None:
    """
    Use OpenAI GPT to simplify a concept (ChatGPT-quality).
    Returns None if OpenAI is unavailable or fails.
    """
    try:
        from django.conf import settings
        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if not api_key:
            return None

        from openai import OpenAI
        import json

        client = OpenAI(api_key=api_key)

        # Build context block from note text
        context_block = ''
        if note_context:
            trimmed = note_context[:1500]
            context_block = (
                f"\n\nHere is some context from the student's notes that may be relevant:\n"
                f"---\n{trimmed}\n---\n"
            )

        user_prompt = f"""The student wants to understand: "{text}"
{context_block}
Respond in EXACTLY this JSON format (no markdown, no code fences, just raw JSON):
{{
  "simplified": "A clear, simple explanation in 2-3 sentences that a 10-year-old would understand. Use simple words.",
  "analogy": "A fun real-world analogy or example that makes the concept click. Start with something like 'Think of it like...' or 'It's like...'",
  "emoji": "A single emoji that represents this concept"
}}

Rules:
- Use very simple language, short sentences
- The analogy must be relatable (food, school, games, daily life)
- Do NOT use technical jargon in the explanation
- Be engaging and fun"""

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a friendly tutor explaining concepts to a 10-year-old student. Always respond with valid JSON only, no markdown.',
                },
                {'role': 'user', 'content': user_prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        raw = response.choices[0].message.content.strip()

        # Parse JSON from response (strip markdown fences if present)
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        data = json.loads(raw)

        simplified = data.get('simplified', '').strip()
        analogy = data.get('analogy', '').strip()
        emoji = data.get('emoji', '✨').strip()

        if simplified and analogy:
            return {
                'simple': simplified,
                'analogy': analogy,
                'emoji': emoji,
            }
        return None

    except Exception as e:
        logger.warning(f"OpenAI simplification failed: {e}")
        return None


def simplify_concept(text: str, note_context: str = '') -> dict:
    """
    Main entry point.

    Strategy:
    1. Check curated concept DB (instant, offline)
    2. If not found, use Gemini AI (ChatGPT-like quality)
    3. If Gemini unavailable, return helpful error asking to set up API key

    Args:
        text: The paragraph or concept to simplify.
        note_context: Optional text from the current note for extra context.

    Returns:
        {
            'original': str,
            'simplified': str,
            'analogy': str,
            'emoji': str,
            'matched_concept': bool,
            'ai_powered': bool,
            'success': bool,
            'error': str,
        }
    """
    if not text or len(text.strip()) < 3:
        return {
            'original': text or '',
            'simplified': '',
            'analogy': '',
            'emoji': '',
            'matched_concept': False,
            'ai_powered': False,
            'success': False,
            'error': 'Please provide some text to simplify.',
        }

    # 1. Curated DB — instant, offline
    entry = _find_best_concept(text)
    if entry:
        return {
            'original': text.strip(),
            'simplified': entry['simple'],
            'analogy': entry['analogy'],
            'emoji': entry.get('emoji', '💡'),
            'matched_concept': True,
            'ai_powered': False,
            'success': True,
            'error': '',
        }

    # 2. OpenAI GPT — ChatGPT-quality
    ai_result = _simplify_with_ai(text, note_context)
    if ai_result:
        return {
            'original': text.strip(),
            'simplified': ai_result['simple'],
            'analogy': ai_result['analogy'],
            'emoji': ai_result.get('emoji', '✨'),
            'matched_concept': False,
            'ai_powered': True,
            'success': True,
            'error': '',
        }

    # 3. No AI available
    return {
        'original': text.strip(),
        'simplified': '',
        'analogy': '',
        'emoji': '',
        'matched_concept': False,
        'ai_powered': False,
        'success': False,
        'error': 'AI service is not configured. Please set OPENAI_API_KEY in your environment.',
    }
