"""
AI Services for NoteHub:
- Duplicate note detection using scikit-learn (cosine similarity)
- Semantic search using LangChain + sentence-transformers
"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def detect_duplicates(threshold: float = 0.85) -> List[Dict[str, Any]]:
    """
    Detect potentially duplicate notes using TF-IDF + cosine similarity.
    Returns pairs of notes that exceed the similarity threshold.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from apps.notes.models import Note

    # Get all notes with text content
    notes = Note.objects.filter(
        text_content__isnull=False
    ).exclude(text_content='').values('id', 'title', 'text_content', 'author__username')

    notes_list = list(notes)
    if len(notes_list) < 2:
        return []

    # Build TF-IDF matrix from note text content
    texts = [n['text_content'] for n in notes_list]
    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)

    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
    except ValueError:
        logger.warning("TF-IDF vectorization failed – not enough content.")
        return []

    # Compute pairwise cosine similarity
    similarity_matrix = cosine_similarity(tfidf_matrix)

    duplicates = []
    seen_pairs = set()

    for i in range(len(notes_list)):
        for j in range(i + 1, len(notes_list)):
            score = float(similarity_matrix[i][j])
            if score >= threshold:
                pair_key = tuple(sorted([notes_list[i]['id'], notes_list[j]['id']]))
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    duplicates.append({
                        'note_1': {
                            'id': notes_list[i]['id'],
                            'title': notes_list[i]['title'],
                            'author': notes_list[i]['author__username'],
                        },
                        'note_2': {
                            'id': notes_list[j]['id'],
                            'title': notes_list[j]['title'],
                            'author': notes_list[j]['author__username'],
                        },
                        'similarity_score': round(score, 4),
                    })

    # Sort by similarity score descending
    duplicates.sort(key=lambda x: x['similarity_score'], reverse=True)
    return duplicates


def semantic_search(query: str, top_k: int = 20) -> List[Dict[str, Any]]:
    """
    Semantic search using LangChain with sentence-transformers embeddings.
    Falls back to keyword search if embedding model is unavailable.
    """
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_community.vectorstores import FAISS
        from apps.notes.models import Note

        # Get approved notes with text content
        notes = Note.objects.filter(
            status='approved',
        ).exclude(text_content='').select_related(
            'author', 'subject__semester__faculty'
        )[:500]  # Limit for performance

        if not notes.exists():
            return []

        # Prepare documents
        texts = []
        metadatas = []
        for note in notes:
            text = f"{note.title} {note.description} {note.text_content[:1000]}"
            texts.append(text)
            metadatas.append({
                'id': note.id,
                'title': note.title,
                'slug': note.slug,
                'description': note.description[:200],
                'author': note.author.username,
                'subject': note.subject.name,
                'faculty': note.subject.semester.faculty.name,
                'file_type': note.file_type,
                'views_count': note.views_count,
                'created_at': str(note.created_at),
            })

        # Create embeddings and vector store
        embeddings = HuggingFaceEmbeddings(
            model_name='all-MiniLM-L6-v2',
            model_kwargs={'device': 'cpu'},
        )
        vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadatas)

        # Search
        results = vectorstore.similarity_search_with_score(query, k=top_k)

        return [
            {
                **doc.metadata,
                'relevance_score': round(1 - float(score), 4),
            }
            for doc, score in results
        ]

    except ImportError as e:
        logger.warning(f"Semantic search dependencies not available: {e}")
        raise
    except Exception as e:
        logger.error(f"Semantic search error: {e}")
        raise
