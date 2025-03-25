// const mongoose = require("mongoose");
// require("dotenv").config();

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const StudentSchema = new mongoose.Schema({
//   rollNo: String,
//   parentEmail: String,
// });

// const Student = mongoose.model("Student", StudentSchema);

// // Function to update parent email
// async function updateParentEmail(rollNo, newEmail) {
//   try {
//     const result = await Student.updateOne(
//       { rollNo },
//       { $set: { parentEmail: newEmail } }
//     );
//     if (result.modifiedCount > 0) {
//       console.log(`Email updated successfully for Roll No: ${rollNo}`);
//     } else {
//       console.log("No matching student found or email already up-to-date.");
//     }
//   } catch (error) {
//     console.error("Error updating email:", error);
//   } finally {
//     mongoose.connection.close();
//   }
// }

// // Example Usage
// updateParentEmail("21ECE07777777", "shritiroy3754@gmail.com");



// const mongoose = require("mongoose");
// require("dotenv").config();

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const StudentSchema = new mongoose.Schema({
//   rollNo: String,
//   parentEmail: String,
// });

// const Student = mongoose.model("Student", StudentSchema);

// // Function to update roll number using email
// async function updateRollNo(email, newRollNo) {
//   try {
//     const result = await Student.updateOne(
//       { parentEmail: email },
//       { $set: { rollNo: newRollNo } }
//     );
//     if (result.modifiedCount > 0) {
//       console.log(`Roll No updated successfully for Email: ${email}`);
//     } else {
//       console.log(
//         "No matching student found or roll number already up-to-date."
//       );
//     }
//   } catch (error) {
//     console.error("Error updating roll number:", error);
//   } finally {
//     mongoose.connection.close();
//   }
// }

// // Example Usage
// updateRollNo("vikram.singh@example.com", "21ECE07777777");





// const mongoose = require("mongoose");
// require("dotenv").config();

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const StudentSchema = new mongoose.Schema({
//   rollNo: String,
//   parentEmail: String,
// });

// const Student = mongoose.model("Student", StudentSchema);

// // Function to delete a student by roll number
// async function deleteStudent(rollNo) {
//   try {
//     const result = await Student.deleteOne({ rollNo });
//     if (result.deletedCount > 0) {
//       console.log(`Student with Roll No: ${rollNo} deleted successfully.`);
//     } else {
//       console.log("No matching student found.");
//     }
//   } catch (error) {
//     console.error("Error deleting student:", error);
//   } finally {
//     mongoose.connection.close();
//   }
// }

// // Example Usage
// deleteStudent("21ECE015");




const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const StudentSchema = new mongoose.Schema({
  rollNo: String,
  name: String,
  department: String,
  section: String,
  parentEmail: String,
  attendance: Object, // Store attendance as { "2025-03-17": "Present", "2025-03-18": "Absent" }
});

const Student = mongoose.model("Student", StudentSchema);

// Function to add a new student
async function addStudent(studentData) {
  try {
    const newStudent = new Student(studentData);
    await newStudent.save();
    console.log(`Student ${studentData.name} added successfully!`);
  } catch (error) {
    console.error("Error adding student:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Example Usage
addStudent({
  rollNo: "21ECE015",
  name: "Shruti Roy",
  department: "ECE",
  section: "1",
  parentEmail: "shritiroy3754@gmail.com",
  attendance: {},
});
