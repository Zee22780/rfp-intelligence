import React from "react";

const HelpPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RFP Intelligence Helpful Tips
        </h1>
        <div className="w-12 h-1 bg-blue-600 rounded mb-10" />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            How to use
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            The RFP Intelligence Tool helps you quickly find and reuse approved
            content from the document library. Type a question, and the tool
            searches existing documents to generate a draft response you can
            copy, refine, and submit.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Every response includes three parts:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
            <li>
              <span className="font-semibold text-gray-700">
                Synthesized response
              </span>{" "}
              — a draft answer drawn from source documents
            </li>
            <li>
              <span className="font-semibold text-gray-700">
                Confidence score
              </span>{" "}
              — how well the sources matched your question (High / Medium / Low)
            </li>
            <li>
              <span className="font-semibold text-gray-700">
                Source documents
              </span>{" "}
              — the exact files and pages used to generate the response
            </li>
          </ol>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-gray-600 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">
              Understanding Confidence Scores
            </p>
            A High confidence score means the tool found strong matches. Medium
            means it found something relevant but incomplete. Low means the
            knowledge base may not have enough content to answer well. Try
            rephrasing your question, or check whether the right documents have
            been uploaded.
          </div>
          <p className="text-gray-600 leading-relaxed mt-4">
            If the tool can't find a good answer, it will say so. This is
            intentional. The tool was designed not to just make something up.
          </p>
          <br />
          <div>
            <p className="font-semibold text-gray-700 mb-1">AI Chat</p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Each session starts fresh with a new chat. As you work, you can
              always return to your current conversation using the Current AI
              Chat button in the sidebar, or start over with New AI Chat.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Document Library Management
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            This is where all uploaded documents live. The quality of the tool's
            responses depends entirely on what documents are loaded into it.
            Keep documents current and relevant to the kinds of questions you
            typically see in RFPs.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-gray-600 leading-relaxed">
            <span className="font-semibold text-amber-700">
              ⚠️ Before uploading
            </span>
            , check that the document isn't already in the library. The tool
            doesn't detect duplicates. Uploading multiple versions of the same
            document won't break anything, but it will gradually degrade
            response quality over time. If you're replacing an outdated version,
            delete the old one first.
          </div>

          <br />
          <p>
            After uploading a document, you can click the "refresh" button up
            top so that the document says "Ready" in the document library. Any
            documents that say failed will need to be deleted and uploaded
            again.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Recent Searches
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Displays your recent queries. Click any of them to re-run a search.
            Note: responses may vary slightly in wording each time, but will
            always be grounded in the same source documents.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Feedback</h2>
          <p className="text-gray-600 leading-relaxed">
            Spot an error? Wish something worked differently? Use the feedback
            button in the lower left sidebar. Every submission helps improve the
            tool.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HelpPage;
