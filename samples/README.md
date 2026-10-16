# Sample documents

Fake documents for rehearsing the Eddembe demo. Every file is marked **SAMPLE** and uses made-up names,
places and phone numbers. None of them is a real document.

| File | What it tests |
|---|---|
| `sample-eviction-notice.jpg` | A notice to leave in three days, a withheld deposit, threats to remove property. |
| `sample-termination-letter.jpg` | Dismissal without notice and two months of unpaid salary. |
| `sample-land-sale-agreement.jpg` | Amounts that do not add up, missing signatures and date. |
| `sample-employment-contract.pdf` | PDF upload: unpaid overtime, no leave, termination without notice. |
| `sample-employment-contract.docx` | The same contract as a Word file. |

Regenerate them with:

```bash
python3 samples/make_samples.py        # the three photos (needs Pillow)
python3 samples/make_text_samples.py   # the PDF and Word files (needs google-chrome for the PDF)
```
