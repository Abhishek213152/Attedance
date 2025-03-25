const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or another service like 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Connection Error:", err));

// Student Schema
const StudentSchema = new mongoose.Schema({
  rollNo: String,
  name: String,
  department: String,
  section: String,
  parentEmail: String,
  attendance: Object, // Store attendance as { "2025-03-17": "Present", "2025-03-18": "Absent" }
});

const Student = mongoose.model("Student", StudentSchema);

// Department Schema
const DepartmentSchema = new mongoose.Schema({
  name: String,
  sections: [String],
});

const Department = mongoose.model("Department", DepartmentSchema);

// API Routes

// Root Route
app.get("/", (req, res) => {
  res.send("Attendance Management System API");
});

// Get all departments
app.get("/api/departments", async (req, res) => {
  try {
    // Get departments from student data
    const deptFromStudents = await Student.aggregate([
      {
        $group: {
          _id: { department: "$department", section: "$section" },
        },
      },
      {
        $group: {
          _id: "$_id.department",
          sections: { $addToSet: "$_id.section" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          sections: 1,
        },
      },
    ]);
    res.json(deptFromStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get students based on department & section
app.get("/api/students", async (req, res) => {
  try {
    const { department, section } = req.query;
    const students = await Student.find({ department, section });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new student
app.post("/api/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json({ message: "Student added successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Function to send attendance notification email
const sendAttendanceEmail = async (student, date, status) => {
  try {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: student.parentEmail,
      subject: `Attendance Update for ${student.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a4a4a; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Attendance Notification</h2>
          <p>Dear Parent/Guardian,</p>
          <p>This is to inform you that the attendance status for <strong>${
            student.name
          }</strong> (Roll No: ${
        student.rollNo
      }) has been marked as <strong>${status}</strong> for <strong>${formattedDate}</strong>.</p>
          <div style="background-color: ${
            status === "Present" ? "#e7f7e7" : "#ffebee"
          }; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 0; color: ${
              status === "Present" ? "#2e7d32" : "#c62828"
            };">
              <strong>Attendance Status: ${status}</strong>
            </p>
          </div>
          <p>Department: ${student.department}</p>
          <p>Section: ${student.section}</p>
          <p>If you have any questions regarding this update, please contact the school administration.</p>
          <p style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eaeaea; color: #757575; font-size: 0.9em;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${student.parentEmail} for ${student.name}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Mark Attendance with email notification
app.post("/api/attendance", async (req, res) => {
  try {
    const { date, department, section, attendance } = req.body;

    // Keep track of students whose attendance was changed
    const changedAttendance = [];

    // First get the current state of all affected students
    const rollNumbers = Object.keys(attendance);
    const studentsToUpdate = await Student.find({
      rollNo: { $in: rollNumbers },
      department,
      section,
    });

    // Create a map for easy lookup
    const studentMap = {};
    studentsToUpdate.forEach((student) => {
      studentMap[student.rollNo] = student;
    });

    // Process each attendance update
    const updates = [];
    for (const [rollNo, status] of Object.entries(attendance)) {
      const student = studentMap[rollNo];
      if (student) {
        // Check if attendance has actually changed
        const currentStatus = student.attendance && student.attendance[date];

        // Only update if the status has changed or is new
        if (currentStatus !== status) {
          updates.push(
            Student.updateOne(
              { rollNo, department, section },
              { $set: { [`attendance.${date}`]: status } }
            )
          );

          changedAttendance.push({
            student,
            status,
          });
        }
      }
    }

    // Execute all database updates
    await Promise.all(updates);

    // Send emails for all changed attendance records
    for (const { student, status } of changedAttendance) {
      await sendAttendanceEmail(student, date, status);
    }

    res.json({
      message: "Attendance updated!",
      emailsSent: changedAttendance.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance of a student
app.get("/api/students/:rollNo", async (req, res) => {
  try {
    const student = await Student.findOne({ rollNo: req.params.rollNo });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to your server.js file, before the "Start Server" section

// Send Monthly Report Email
app.post("/api/send-email", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      parentEmail,
      department,
      section,
      startDate,
      endDate,
      presentDays,
      totalDays,
      attendancePercentage
    } = req.body;

    // Format dates for display
    const formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    
    const formattedEndDate = new Date(endDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Determine status color based on attendance percentage
    let statusColor = "#2e7d32"; // Green for good attendance
    let statusClass = "Good";
    
    if (attendancePercentage < 75 && attendancePercentage >= 50) {
      statusColor = "#f57c00"; // Orange for concerning attendance
      statusClass = "Concerning";
    } else if (attendancePercentage < 50) {
      statusColor = "#c62828"; // Red for poor attendance
      statusClass = "Poor";
    }

    // Create email template
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: parentEmail,
      subject: `Monthly Attendance Report for ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a4a4a; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Monthly Attendance Report</h2>
          <p>Dear Parent/Guardian,</p>
          <p>This is the monthly attendance report for <strong>${studentName}</strong> (Student ID: ${studentId}).</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Report Details:</h3>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Section:</strong> ${section}</p>
            <p><strong>Report Period:</strong> ${formattedStartDate} to ${formattedEndDate}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Attendance Summary:</h3>
            <p><strong>Present Days:</strong> ${presentDays} out of ${totalDays} total days</p>
            <p><strong>Attendance Rate:</strong> <span style="color: ${statusColor}; font-weight: bold;">${attendancePercentage}%</span></p>
            <p><strong>Attendance Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusClass}</span></p>
          </div>
          
          <div style="margin-top: 20px;">
            <p>If you have any questions regarding this report, please contact the school administration.</p>
            <p>Thank you for your continued support in your child's education.</p>
          </div>
          
          <p style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eaeaea; color: #757575; font-size: 0.9em;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Monthly report email sent to ${parentEmail} for ${studentName}`);
    
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending monthly report email:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to send email"
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
