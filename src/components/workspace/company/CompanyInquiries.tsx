export default function CompanyInquiries({
  inquiries,
}: any) {

  return (

    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">
              Inquiry
            </th>

            <th className="p-3 text-left">
              Subject
            </th>

            <th className="p-3 text-left">
              Status
            </th>

          </tr>

        </thead>

        <tbody>

          {(inquiries || []).map((item: any) => (

            <tr
              key={item.id}
              className="border-t"
            >

              <td className="p-3">
                {item.inquiry_no}
              </td>

              <td className="p-3">
                {item.subject}
              </td>

              <td className="p-3">
                {item.status}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}