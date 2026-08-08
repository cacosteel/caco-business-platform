import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../../services/orderService";
import { supabase } from "../../lib/supabase";


export default function OrderForm() {

  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<any[]>([]);


  const [form, setForm] = useState({

    quotation_id: "",
    order_no: "",
    currency: "USD",
    total_amount: 0,
    notes: "",

  });



  async function loadQuotations() {

    const { data, error } =
      await supabase
        .from("quotations")
        .select(`
          id,
          quotation_no,
          total_amount,
          currency,
          inquiries (
            subject,
            companies (
              name
            )
          )
        `)
        .order("created_at", {
          ascending: false,
        });



    if (!error) {

      setQuotations(data || []);

    }

  }



  useEffect(() => {

    loadQuotations();

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


      await createOrder({

        quotation_id:
          form.quotation_id,

        order_no:
          form.order_no,

        currency:
          form.currency,

        total_amount:
          Number(form.total_amount),

        notes:
          form.notes,

      });



      navigate(
        "/dashboard/orders"
      );



    } catch (error) {


      console.error(
        "Create order error:",
        error
      );


    }

  }






  return (

    <div className="p-6">


      <h1 className="text-2xl font-semibold mb-6">

        New Order

      </h1>



      <form

        onSubmit={handleSubmit}

        className="bg-white rounded-lg shadow p-6 space-y-4"

      >



        <div>

          <label className="block mb-1">

            Quotation

          </label>


          <select

            name="quotation_id"

            value={form.quotation_id}

            onChange={handleChange}

            className="border rounded w-full p-2"

            required

          >


            <option value="">

              Select Quotation

            </option>



            {quotations.map((item) => (

              <option

                key={item.id}

                value={item.id}

              >

                {item.quotation_no}

                {" - "}

                {item.inquiries?.companies?.name}


              </option>


            ))}



          </select>


        </div>





        <div>

          <label className="block mb-1">

            Order No

          </label>


          <input

            name="order_no"

            value={form.order_no}

            onChange={handleChange}

            className="border rounded w-full p-2"

            placeholder="ORD-2026-001"

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

            className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded"

          >

            Save Order

          </button>




          <button

            type="button"

            onClick={() =>
              navigate("/dashboard/orders")
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
