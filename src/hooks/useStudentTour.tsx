import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import introJs from 'intro.js';
import 'intro.js/introjs.css';

// Custom CSS for intro.js styling
const addTourStyles = () => {
  if (!document.getElementById('tour-styles')) {
    const style = document.createElement('style');
    style.id = 'tour-styles';
    style.textContent = `
      .introjs-tooltip {
        font-family: system-ui, -apple-system, sans-serif;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #e5e7eb;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        max-width: 400px;
      }
      
      .introjs-tooltiptext {
        font-size: 16px;
        line-height: 1.5;
        padding: 8px 0;
      }
      
      .introjs-tooltip-header {
        padding: 16px 20px 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .introjs-tooltip-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        color: white;
      }
      
      .introjs-tooltipbuttons {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0 0 12px 12px;
      }
      
      .introjs-button {
        border-radius: 8px;
        font-weight: 500;
        padding: 8px 16px;
        transition: all 0.2s;
      }
      
      .introjs-nextbutton {
        background: #10b981 !important;
        border: none !important;
        color: white !important;
      }
      
      .introjs-nextbutton:hover {
        background: #059669 !important;
        transform: translateY(-1px);
      }
      
      .introjs-prevbutton {
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        color: white !important;
      }
      
      .introjs-skipbutton {
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        color: white !important;
      }
      
      .introjs-overlay {
        background: rgba(0, 0, 0, 0.6) !important;
      }
      
      .introjs-helperLayer {
        border-radius: 8px;
        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3);
      }
      
      .introjs-tooltipReferenceLayer {
        border-radius: 8px;
      }
      
      .tour-emoji {
        font-size: 24px;
        margin-right: 8px;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }
};

interface TourStep {
  element: string;
  intro: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const studentTourSteps: TourStep[] = [
  {
    element: 'body',
    title: 'Selamat datang di English Spark! 🎓',
    intro: 'Halo! Mari kita kenalan dengan dashboard kamu. Tour ini akan memandu kamu mengenal semua fitur yang tersedia untuk meningkatkan kemampuan bahasa Inggris kamu.',
    position: 'bottom'
  },
  {
    element: '[data-tour="total-points"]',
    title: 'Total Poin Kamu ⭐',
    intro: 'Ini adalah total poin yang sudah kamu kumpulin dari semua quiz yang udah dikerjakan. Semakin banyak quiz yang kamu selesaikan dengan benar, semakin banyak poin yang kamu dapat!',
    position: 'bottom'
  },
  {
    element: '[data-tour="current-level"]',
    title: 'Level Progression 🏆',
    intro: 'Level kamu saat ini! Setiap 100 poin, kamu akan naik ke level berikutnya. Keep grinding untuk mencapai level yang lebih tinggi!',
    position: 'bottom'
  },
  {
    element: '[data-tour="streak-days"]',
    title: 'Streak Days 🔥',
    intro: 'Ini adalah jumlah hari berturut-turut kamu belajar dan mengerjakan quiz. Streak yang konsisten akan membantu kamu belajar lebih efektif!',
    position: 'bottom'
  },
  {
    element: '[data-tour="class-rank"]',
    title: 'Ranking di Kelas 📊',
    intro: 'Posisi ranking kamu di dalam kelas. Ini menunjukkan seberapa baik performa kamu dibanding teman-teman sekelas. Jangan sampai turun ya!',
    position: 'bottom'
  },
  {
    element: '[data-tour="level-progress"]',
    title: 'Progress Bar Level 📈',
    intro: 'Progress bar ini menunjukkan seberapa dekat kamu dengan level berikutnya. Kerjakan lebih banyak quiz untuk mengisi bar ini sampai penuh!',
    position: 'top'
  },
  {
    element: '[data-tour="assigned-quizzes"]',
    title: 'Quiz yang Di-assign Teacher 📝',
    intro: 'Di sini kamu bisa lihat semua quiz yang di-assign sama teacher kamu. Quiz ini wajib dikerjakan dan biasanya ada deadline-nya!',
    position: 'top'
  },
  {
    element: '[data-tour="sidebar-results"]',
    title: 'Hasil Quiz Kamu 📊',
    intro: 'Klik menu ini untuk melihat semua hasil quiz yang udah kamu kerjakan. Kamu bisa review jawaban dan lihat mana yang salah atau benar.',
    position: 'right'
  },
  {
    element: '[data-tour="sidebar-leaderboard"]',
    title: 'Leaderboard 🏅',
    intro: 'Di sini kamu bisa lihat ranking semua siswa di aplikasi. Siapa tau kamu bisa masuk top 10!',
    position: 'right'
  },
  {
    element: '[data-tour="sidebar-materials"]',
    title: 'Study Materials 📚',
    intro: 'Materi belajar mandiri yang disediakan teacher. Kamu bisa belajar dari video, PDF, audio, dan materi lainnya untuk persiapan quiz.',
    position: 'right'
  },
  {
    element: '[data-tour="sidebar-achievements"]',
    title: 'Achievements 🏆',
    intro: 'Collection achievement yang udah kamu raih! Setiap pencapaian khusus akan dapat badge yang keren.',
    position: 'right'
  },
  {
    element: '[data-tour="sidebar-profile"]',
    title: 'Profile Management 👤',
    intro: 'Di menu ini kamu bisa edit profile kamu, ganti password, dan atur preferensi lainnya.',
    position: 'right'
  }
];

export const useStudentTour = () => {
  const { user, role } = useAuth();

  // Check if user is a student and hasn't seen the tour
  const checkUserRole = useCallback(() => {
    return role === 'student';
  }, [role]);

  // Check if it's student's first time or tour not completed
  const isFirstTimeStudent = useCallback(() => {
    const tourCompleted = localStorage.getItem('studentTourCompleted');
    const userSpecificTour = localStorage.getItem(`studentTour_${user?.id}`);
    return !tourCompleted && !userSpecificTour;
  }, [user?.id]);

  // Store tour completion
  const markTourCompleted = useCallback(() => {
    localStorage.setItem('studentTourCompleted', 'true');
    if (user?.id) {
      localStorage.setItem(`studentTour_${user.id}`, 'true');
    }
  }, [user?.id]);

  // Initialize and start the tour
  const startTour = useCallback(() => {
    // Add custom styles
    addTourStyles();

    // Configure intro.js
    const intro = introJs();
    
    // Wait for elements to be available
    const checkElements = () => {
      const allElementsExist = studentTourSteps.every(step => {
        if (step.element === 'body') return true;
        return document.querySelector(step.element) !== null;
      });
      
      if (allElementsExist) {
        // Set up steps with proper data attributes
        intro.setOptions({
          steps: studentTourSteps.map(step => ({
            element: step.element,
            intro: `
              <div class="introjs-tooltip-header">
                <h3 class="introjs-tooltip-title">${step.title || ''}</h3>
              </div>
              <div style="padding: 16px 20px;">
                ${step.intro}
              </div>
            `,
            position: step.position || 'bottom'
          })),
          showProgress: true,
          showBullets: false,
          exitOnEsc: true,
          exitOnOverlayClick: false,
          disableInteraction: false,
          nextLabel: 'Lanjut →',
          prevLabel: '← Kembali',
          skipLabel: 'Skip Tour',
          doneLabel: 'Selesai! 🎉'
        });

        // Event handlers
        intro.onbeforechange(function(targetElement) {
          // Scroll element into view if needed
          if (targetElement && targetElement !== document.body) {
            targetElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            });
          }
        });

        intro.oncomplete(function() {
          markTourCompleted();
          console.log('Student tour completed!');
        });

        intro.onexit(function() {
          markTourCompleted();
          console.log('Student tour exited');
        });

        // Start the tour
        intro.start();
      } else {
        // Retry after a short delay if elements aren't ready
        setTimeout(checkElements, 500);
      }
    };

    // Initial check with a small delay to ensure DOM is ready
    setTimeout(checkElements, 100);
  }, [markTourCompleted]);

  // Main function to trigger tour if conditions are met
  const initializeTour = useCallback(() => {
    if (checkUserRole() && isFirstTimeStudent()) {
      // Add a delay to ensure the dashboard is fully rendered
      setTimeout(() => {
        startTour();
      }, 1000);
    }
  }, [checkUserRole, isFirstTimeStudent, startTour]);

  // Function to manually start tour (for testing or re-showing)
  const restartTour = useCallback(() => {
    startTour();
  }, [startTour]);

  // Function to reset tour status (for testing)
  const resetTourStatus = useCallback(() => {
    localStorage.removeItem('studentTourCompleted');
    if (user?.id) {
      localStorage.removeItem(`studentTour_${user.id}`);
    }
  }, [user?.id]);

  return {
    initializeTour,
    restartTour,
    resetTourStatus,
    isFirstTimeStudent: isFirstTimeStudent(),
    isStudent: checkUserRole()
  };
};
