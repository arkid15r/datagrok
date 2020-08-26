#name: TextRank Summarizer
#description: Extractive Text Summarization Using TextRank Algorithm
#language: python
#tags: nlp, panel
#input: string text [Given text]
#input: double ratio = 0.6 [Ratio of sentences from text to include in the summary: between 0 and 1]
#output: string summary [Summary]
#help-url: https://arxiv.org/abs/1602.03606 [Variations of the Similarity Function of TextRank for Automated Summarization]

from gensim.summarization.summarizer import summarize


summary = summarize(text, ratio=ratio)
