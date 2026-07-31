import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createQuotation,
} from "../../services/quotationService";

import {
  supabase,
} from "../../lib/supabase";


export default function QuotationForm() {

  const navigate = useNavigate();

  const [inquiries, setInquiries] =
    useState<any[]>([]);


  const [form, setForm] = useState({

    inquiry_id: "",
    quotation_no: "",
    currency: "USD",
    total_amount: 0,
    notes: "",

  });



  async function loadInquiries() {

    const { data, error } =
      await supabase
        .from("inquiries")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (error) {

      console.error(
        "Load inquiries error:",
        error
      );

      return;

    }


    setInquiries(
      data || []
    );

  }



  useEffect(() => {

    loadInquiries();

  }, []);




  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) {

    setForm({

      ...form,

      [e.target.name]:
        e.target.value,

    });

  }




  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();


    try {

      await createQuotation({

        inquiry_id:
          form.inquiry_id,

        quotation_no:
          form.quotation_no,

        currency:
          form.currency,

        total_amount:
          Number(form.total_amount),

        notes:
          form.notes,

      });


      navigate(
        "/dashboard/quotations"
      );


    } catch (error) {

      console.error(
        "Create quotation error:",
        error
      );

    }

  }





  return (

    <div className="p-6">


      <h1 className="text-2xl font-semibold mb-6">
        New Quotation
      </h1>



      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-4"
      >


        <div>

          <label className="block mb-1">
            Inquiry
          </label>


          <select

            name="inquiry_id"

            value={form.inquiry_id}

            onChange={handleChange}

            className="border rounded w-full p-2"

            required

          >


            <option value="">
              Select Inquiry
            </option>



            {inquiries.map((item) => (

              <option

                key={item.id}

                value={item.id}

              >

                {item.subject ||
                  item.id}


              </option>

            ))}


          </select>


        </div>





        <div>

          <label className="block mb-1">
            Quotation No
          </label>


          <input

            name="quotation_no"

            value={form.quotation_no}

            onChange={handleChange}

            className="border rounded w-full p-2"

            placeholder="QT-2026-001"

          />


        </div>





        <div>

          <label className="block mb-1">
            Currency
          </label>


          <select

            name="currency"

            value={form.currency}

            onChange={handleChange}

            className="border rounded w-full p-2"

          >

            <option value="USD">
              USD
            </option>

            <option value="EUR">
              EUR
            </option>

            <option value="GBP">
              GBP
            </option>


          </select>


        </div>





        <div>

          <label className="block mb-1">
            Total Amount
          </label>


          <input

            type="number"

            name="total_amount"

            value={form.total_amount}

            onChange={handleChange}

            className="border rounded w-full p-2"

          />


        </div>





        <div>

          <label className="block mb-1">
            Notes
          </label>


          <textarea

            name="notes"

            value={form.notes}

            onChange={handleChange}

            className="border rounded w-full p-2"

            rows={4}

          />


        </div>





        <div className="flex gap-3">


          <button

            type="submit"

            className="bg-orange-500 text-white px-5 py-2 rounded"

          >

            Save Quotation

          </button>



          <button

            type="button"

            onClick={() =>
              navigate("/dashboard/quotations")
            }

            className="border px-5 py-2 rounded"

          >

            Cancel

          </button>


        </div>


      </form>


    </div>

  );

}