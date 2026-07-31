import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getQuotationById,
  updateQuotation,
  convertQuotationToOrder,
} from "../../services/quotationService";


export default function QuotationDetail() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

async function convertToOrder() {

  if (!id) return;


  try {

    await convertQuotationToOrder(id);


    alert(
      "Quotation converted to order"
    );


    navigate(
      "/dashboard/orders"
    );


  } catch (error) {

    console.error(
      "Convert order error:",
      error
    );

  }

}
  async function loadQuotation() {

    if (!id) return;

    try {

      const data = await getQuotationById(id);

      setQuotation(data);

    } catch (error) {

      console.error(
        "Load quotation error:",
        error
      );

    } finally {

      setLoading(false);

    }

  }


  async function changeStatus(
    status: string
  ) {

    if (!id) return;


    try {

      const updated =
        await updateQuotation(
          id,
          {
            status: status as any,
          }
        );


      setQuotation(updated);


    } catch (error) {

      console.error(
        "Status update error:",
        error
      );

    }

  }



  useEffect(() => {

    loadQuotation();

  }, [id]);



  if (loading) {

    return (
      <div className="p-6">
        Loading quotation...
      </div>
    );

  }



  if (!quotation) {

    return (
      <div className="p-6">
        Quotation not found
      </div>
    );

  }



  return (

    <div className="p-6">


      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-semibold">
          Quotation Details
        </h1>


        <button
          className="border px-4 py-2 rounded"
          onClick={() =>
            navigate("/dashboard/quotations")
          }
        >
          Back
        </button>


      </div>



      <div className="bg-white rounded-lg shadow p-6 space-y-4">


        <div>
          <strong>
            Quotation No:
          </strong>
          {" "}
          {quotation.quotation_no || "-"}
        </div>



        <div>
          <strong>
            Inquiry ID:
          </strong>
          {" "}
          {quotation.inquiry_id}
        </div>



        <div>
          <strong>
            Amount:
          </strong>
          {" "}
          {quotation.total_amount}
          {" "}
          {quotation.currency}
        </div>



        <div>
          <strong>
            Notes:
          </strong>
          {" "}
          {quotation.notes || "-"}
        </div>



        <div>

          <strong>
            Status:
          </strong>


          <div className="flex gap-2 mt-3">

<div className="mt-6">

  <button
    className="px-4 py-2 rounded bg-orange-500 text-white"
    onClick={convertToOrder}
  >
    Convert to Order
  </button>

</div>

            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() =>
                changeStatus("draft")
              }
            >
              Draft
            </button>


            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() =>
                changeStatus("sent")
              }
            >
              Sent
            </button>


            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() =>
                changeStatus("approved")
              }
            >
              Approved
            </button>


            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() =>
                changeStatus("rejected")
              }
            >
              Rejected
            </button>


          </div>

        </div>


      </div>


    </div>

  );

}