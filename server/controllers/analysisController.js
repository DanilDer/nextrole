const model = require('../config/gemini');
const pdfParse = require('pdf-parse');

// ── Main controller function ────────────────────────────────
const analyzeResume = async (req, res) => {

    try{
        //Get the job description from the request body
        const { job_description } = req.body;

        if (!job_description) {
            return res.status(400).json({ error: 'Job description is required' });
        }

        //Get the uploaded PDF file and extract its text
        if (!req.file) {
            return res.status(400).json({ error: 'Resume PDF is required'});
        }

        const pdfData = await pdfParse(req.file.buffer);
        const resumeText = pdfData.text;

        if (!resumeText || resumeText.trim() === '') {
            return res.status(400).json({ error: 'Could not extract text from PDF'});
        }

        //Build the prompt to send to Gemini
        const prompt = `
            You are an expert ATS (Applicant Tracking System) analyzer.
            
            Analyze the following resume against the job description provided.
            
            Return ONLY a valid JSON object with exactly these fields:
            {
                "ats_score": a number from 0 to 100 representing how well the resume matches the job,
                "missing_keywords": an array of important skills or keywords from the job description that are missing or weak in the resume,
                "feedback": a string with 3 to 5 specific actionable suggestions to improve the resume for this role
            }

            Do not include any explanation or text outside the JSON object.

            RESUME:
            ${resumeText}

            JOB DESCRIPTION:
            ${job_description}
            `;
        // Send the prompt to Gemini and get the response
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean and parse the JSON Gemini returns
        const cleaned = responseText.replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(cleaned);

        // Send the result back to the frontend
        res.status(200).json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Something went wrong during analysis' });
    }

};

module.exports = { analyzeResume };