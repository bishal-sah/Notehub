"""
Management command to seed initial resource data.
Usage: python manage.py seed_resources
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.resources.models import Resource

User = get_user_model()

SEED_DATA = [
    # ── Internship Resources ──
    {
        'title': 'Top 15 Internship Platforms for CS Students in Nepal',
        'description': 'A curated list of platforms where Nepali CS students can find internships — including local companies, remote opportunities, and global platforms like Internshala, LinkedIn, and AngelList.',
        'category': 'internship',
        'difficulty': 'beginner',
        'tags': 'internship, nepal, remote, platforms',
        'link': '',
    },
    {
        'title': 'How to Write a Winning Internship Resume',
        'description': 'Step-by-step guide to crafting a resume that stands out for internship applications. Covers formatting, action verbs, quantifying achievements, and tailoring for tech roles.',
        'category': 'internship',
        'difficulty': 'beginner',
        'tags': 'resume, career, tips',
        'link': '',
    },
    {
        'title': 'Cold Emailing for Internships: Templates & Strategy',
        'description': 'Learn how to cold-email companies for internship positions. Includes 5 proven email templates, follow-up strategies, and common mistakes to avoid.',
        'category': 'internship',
        'difficulty': 'intermediate',
        'tags': 'email, networking, strategy',
        'link': '',
    },
    {
        'title': 'Remote Internship Guide: Work From Anywhere',
        'description': 'Everything you need to know about landing and excelling at remote internships. Covers time management, communication tools, and building a remote work portfolio.',
        'category': 'internship',
        'difficulty': 'beginner',
        'tags': 'remote, work-from-home, tips',
        'link': '',
    },

    # ── Project Ideas ──
    {
        'title': 'Build a Full-Stack E-Commerce Platform',
        'description': 'Create a complete e-commerce site with user auth, product catalog, shopping cart, payment integration (Stripe/Khalti), and admin dashboard. Great for portfolio projects.',
        'category': 'project_ideas',
        'difficulty': 'advanced',
        'tags': 'full-stack, react, django, e-commerce',
        'link': '',
    },
    {
        'title': 'Personal Finance Tracker with Charts',
        'description': 'Build a web app that lets users track income/expenses, categorize spending, and view beautiful charts. Uses React, Chart.js, and a REST API backend.',
        'category': 'project_ideas',
        'difficulty': 'intermediate',
        'tags': 'react, charts, finance, api',
        'link': '',
    },
    {
        'title': 'AI-Powered Note Summarizer',
        'description': 'Create a tool that takes long lecture notes and generates concise summaries using OpenAI or Gemini API. Bonus: add flashcard generation.',
        'category': 'project_ideas',
        'difficulty': 'intermediate',
        'tags': 'ai, nlp, openai, python',
        'link': '',
    },
    {
        'title': 'Real-Time Chat App with WebSockets',
        'description': 'Build a real-time messaging app using Socket.io or Django Channels. Features: rooms, typing indicators, read receipts, and file sharing.',
        'category': 'project_ideas',
        'difficulty': 'intermediate',
        'tags': 'websocket, real-time, chat, node',
        'link': '',
    },
    {
        'title': 'Weather App with Location Detection',
        'description': 'A beginner-friendly project using a weather API and geolocation. Display current weather, 5-day forecast, and weather animations.',
        'category': 'project_ideas',
        'difficulty': 'beginner',
        'tags': 'api, javascript, beginner, weather',
        'link': '',
    },

    # ── Interview Q&A ──
    {
        'title': 'Top 50 OOP Interview Questions with Answers',
        'description': 'Comprehensive collection of OOP interview questions covering encapsulation, inheritance, polymorphism, abstraction, SOLID principles, and design patterns. With detailed answers and code examples.',
        'category': 'interview_qa',
        'difficulty': 'intermediate',
        'tags': 'oop, java, interview, design-patterns',
        'link': '',
    },
    {
        'title': 'Database & SQL Interview Questions',
        'description': '40+ SQL and database interview questions covering joins, subqueries, normalization, indexing, transactions, and NoSQL concepts. Includes query writing practice.',
        'category': 'interview_qa',
        'difficulty': 'intermediate',
        'tags': 'sql, database, mysql, postgresql',
        'link': '',
    },
    {
        'title': 'Data Structures & Algorithms: Interview Prep',
        'description': 'Must-know DSA topics for coding interviews: arrays, linked lists, trees, graphs, dynamic programming, and sorting algorithms. With problem-solving patterns.',
        'category': 'interview_qa',
        'difficulty': 'advanced',
        'tags': 'dsa, algorithms, coding, leetcode',
        'link': '',
    },
    {
        'title': 'React.js Interview Questions (2025 Edition)',
        'description': '30 frequently asked React interview questions: hooks, state management, virtual DOM, performance optimization, Next.js, and component patterns.',
        'category': 'interview_qa',
        'difficulty': 'intermediate',
        'tags': 'react, javascript, frontend, hooks',
        'link': '',
    },
    {
        'title': 'Behavioral Interview Questions for Fresh Graduates',
        'description': 'How to answer "Tell me about yourself", "Why should we hire you?", STAR method for behavioral questions, and handling tricky situational questions.',
        'category': 'interview_qa',
        'difficulty': 'beginner',
        'tags': 'behavioral, soft-skills, freshers',
        'link': '',
    },

    # ── Viva Questions ──
    {
        'title': 'Operating System Viva Questions & Answers',
        'description': 'Essential OS viva questions covering process management, memory management, file systems, CPU scheduling, deadlocks, and virtual memory. With concise answers.',
        'category': 'viva',
        'difficulty': 'intermediate',
        'tags': 'os, operating-system, process, memory',
        'link': '',
    },
    {
        'title': 'DBMS Viva Questions for BCA/BIT Students',
        'description': 'Frequently asked DBMS viva questions on ER diagrams, normalization, SQL, relational algebra, transactions, ACID properties, and concurrency control.',
        'category': 'viva',
        'difficulty': 'intermediate',
        'tags': 'dbms, database, normalization, sql',
        'link': '',
    },
    {
        'title': 'Computer Networks Viva Questions',
        'description': 'Comprehensive CN viva prep: OSI model, TCP/IP, subnetting, routing protocols, DNS, HTTP, and network security concepts.',
        'category': 'viva',
        'difficulty': 'intermediate',
        'tags': 'networking, osi, tcp, protocols',
        'link': '',
    },
    {
        'title': 'Web Technology Viva Questions',
        'description': 'Common viva questions on HTML, CSS, JavaScript, PHP, sessions, cookies, AJAX, REST APIs, and MVC architecture.',
        'category': 'viva',
        'difficulty': 'beginner',
        'tags': 'web, html, css, javascript, php',
        'link': '',
    },
    {
        'title': 'Software Engineering Viva Questions',
        'description': 'Key SE viva topics: SDLC models, agile methodology, UML diagrams, testing types, requirement engineering, and project management concepts.',
        'category': 'viva',
        'difficulty': 'intermediate',
        'tags': 'software-engineering, sdlc, agile, uml',
        'link': '',
    },
]


class Command(BaseCommand):
    help = 'Seed the database with initial resource data'

    def handle(self, *args, **options):
        # Use the first admin or first user as the author
        author = User.objects.filter(role='admin').first() or User.objects.first()
        if not author:
            self.stderr.write(self.style.ERROR('No users found. Create a user first.'))
            return

        created = 0
        for item in SEED_DATA:
            _, was_created = Resource.objects.get_or_create(
                title=item['title'],
                defaults={**item, 'author': author},
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {created} new resources (skipped {len(SEED_DATA) - created} existing).'))
